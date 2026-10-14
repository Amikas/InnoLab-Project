package at.fhtw.ctfbackend.services;

import at.fhtw.ctfbackend.dto.ContentTransferPackage;
import at.fhtw.ctfbackend.entity.*;
import at.fhtw.ctfbackend.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

/** Imports and exports portable content; runtime instances and player data never enter the package. */
@Service
public class ContentTransferService {
    private static final String FORMAT = "innolab-content";
    private static final int VERSION = 1;
    private static final long MAX_EXPANDED_BYTES = 45L * 1024 * 1024;
    private static final int MAX_ARCHIVE_ENTRIES = 3000;

    private final ObjectMapper mapper;
    private final ChallengeRepository challengeRepository;
    private final CategoryRepository categoryRepository;
    private final CourseRepository courseRepository;
    private final ModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final ChallengeFileStorageService fileStorageService;

    public ContentTransferService(ObjectMapper mapper, ChallengeRepository challengeRepository,
                                  CategoryRepository categoryRepository, CourseRepository courseRepository,
                                  ModuleRepository moduleRepository, LessonRepository lessonRepository,
                                  ChallengeFileStorageService fileStorageService) {
        this.mapper = mapper;
        this.challengeRepository = challengeRepository;
        this.categoryRepository = categoryRepository;
        this.courseRepository = courseRepository;
        this.moduleRepository = moduleRepository;
        this.lessonRepository = lessonRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public byte[] exportPackage(ExportRequest request) {
        String mode = request == null || request.mode() == null ? "ALL" : request.mode().toUpperCase(Locale.ROOT);
        Set<String> requestedChallengeIds = safeSet(request == null ? null : request.challengeIds());
        Set<String> requestedCourseSlugs = safeSet(request == null ? null : request.courseSlugs());
        List<ChallengeEntity> allChallenges = challengeRepository.findAll();
        List<CourseEntity> allCourses = courseRepository.findAll();
        List<ChallengeEntity> selectedChallenges = new ArrayList<>();
        List<CourseEntity> selectedCourses = new ArrayList<>();

        if (mode.equals("ALL")) {
            selectedChallenges.addAll(allChallenges);
            selectedCourses.addAll(allCourses);
        } else if (mode.equals("SELECTED") || mode.equals("ITEM")) {
            Map<String, ChallengeEntity> challengesById = allChallenges.stream()
                    .collect(Collectors.toMap(ChallengeEntity::getId, Function.identity()));
            Map<String, CourseEntity> coursesBySlug = allCourses.stream()
                    .filter(course -> course.getSlug() != null)
                    .collect(Collectors.toMap(CourseEntity::getSlug, Function.identity()));
            for (String id : requestedChallengeIds) {
                ChallengeEntity challenge = challengesById.get(id);
                if (challenge == null) throw new IllegalArgumentException("Unknown challenge ID: " + id);
                selectedChallenges.add(challenge);
            }
            for (String slug : requestedCourseSlugs) {
                CourseEntity course = coursesBySlug.get(slug);
                if (course == null) throw new IllegalArgumentException("Unknown course slug: " + slug);
                selectedCourses.add(course);
            }
            Set<String> linkedIds = selectedCourses.stream().flatMap(course -> course.getModules().stream())
                    .flatMap(module -> module.getLessons().stream()).flatMap(lesson -> safeList(lesson.getChallengeIds()).stream())
                    .collect(Collectors.toSet());
            for (String id : linkedIds) {
                ChallengeEntity linked = challengesById.get(id);
                if (linked == null) throw new IllegalArgumentException("Course references missing challenge: " + id);
                if (selectedChallenges.stream().noneMatch(c -> c.getId().equals(id))) selectedChallenges.add(linked);
            }
            if (selectedChallenges.isEmpty() && selectedCourses.isEmpty()) {
                throw new IllegalArgumentException("Select at least one challenge or course to export.");
            }
        } else {
            throw new IllegalArgumentException("Export mode must be ALL, SELECTED, or ITEM.");
        }

        Map<String, byte[]> assets = new LinkedHashMap<>();
        List<ContentTransferPackage.Challenge> challenges = new ArrayList<>();
        for (ChallengeEntity entity : selectedChallenges) challenges.add(exportChallenge(entity, assets));

        List<ContentTransferPackage.Course> courses = selectedCourses.stream()
                .map(this::exportCourse).toList();
        Set<String> categoryIds = selectedChallenges.stream().map(ChallengeEntity::getCategory)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        List<ContentTransferPackage.Category> categories = categoryIds.stream()
                .map(categoryRepository::findById).flatMap(Optional::stream)
                .map(category -> new ContentTransferPackage.Category(category.getId(), category.getName(),
                        category.getSummary(), category.getNameDe(), category.getSummaryDe(), category.getFileUrl()))
                .toList();

        ContentTransferPackage content = new ContentTransferPackage(FORMAT, VERSION, categories, challenges, courses);
        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
                putZipEntry(zip, "manifest.json", mapper.writeValueAsBytes(content));
                for (Map.Entry<String, byte[]> asset : assets.entrySet()) putZipEntry(zip, asset.getKey(), asset.getValue());
            }
            if (bytes.size() > 50L * 1024 * 1024) throw new IllegalArgumentException("Export exceeds the 50 MB package limit.");
            return bytes.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Could not create content package.", e);
        }
    }

    @Transactional(readOnly = true)
    public Preview preview(byte[] archive) {
        ParsedPackage parsed = parsePackage(archive);
        List<Conflict> conflicts = conflicts(parsed.content());
        return new Preview(parsed.content().challenges().size(), parsed.content().courses().size(), conflicts);
    }

    @Transactional
    public ImportResult importPackage(byte[] archive, List<Decision> decisions) {
        ParsedPackage parsed = parsePackage(archive);
        List<Conflict> conflicts = conflicts(parsed.content());
        Map<String, String> choices = validateDecisions(conflicts, decisions);

        List<ContentTransferPackage.Challenge> challengeImports = parsed.content().challenges().stream()
                .filter(item -> !"SKIP".equals(choices.get("challenge:" + item.id()))).toList();
        List<ContentTransferPackage.Course> courseImports = parsed.content().courses().stream()
                .filter(item -> !"SKIP".equals(choices.get("course:" + item.slug()))).toList();

        List<FolderSwap> folderSwaps = stageAndSwapFolders(challengeImports, parsed.assets());
        registerFolderRollback(folderSwaps);
        int createdChallenges = 0;
        int updatedChallenges = 0;
        int createdCourses = 0;
        int updatedCourses = 0;
        int skipped = (int) conflicts.stream().filter(conflict ->
                "SKIP".equals(choices.get(conflict.type() + ":" + conflict.key()))).count();

        for (ContentTransferPackage.Category category : safeList(parsed.content().categories())) {
            if (!categoryRepository.existsById(category.id())) {
                CategoryEntity entity = new CategoryEntity(category.id(), category.name(), category.summary(), category.fileUrl());
                entity.setNameDe(category.nameDe());
                entity.setSummaryDe(category.summaryDe());
                categoryRepository.save(entity);
            }
        }

        for (ContentTransferPackage.Challenge item : challengeImports) {
            boolean exists = challengeRepository.existsById(item.id());
            ChallengeEntity entity = challengeRepository.findById(item.id()).orElseGet(ChallengeEntity::new);
            applyChallenge(item, entity, parsed.assets());
            entity.setChallengeFolderPath(fileStorageService.getChallengeBasePath(item.id()));
            entity.setImageRevision(UUID.randomUUID().toString());
            challengeRepository.saveAndFlush(entity);
            if (exists) updatedChallenges++; else createdChallenges++;
        }
        for (ContentTransferPackage.Course item : courseImports) {
            boolean exists = courseRepository.findBySlug(item.slug()).isPresent();
            CourseEntity course = courseRepository.findBySlug(item.slug()).orElseGet(CourseEntity::new);
            applyCourse(item, course, exists);
            courseRepository.saveAndFlush(course);
            if (exists) updatedCourses++; else createdCourses++;
        }
        return new ImportResult(createdChallenges, updatedChallenges, createdCourses, updatedCourses, skipped);
    }

    private ContentTransferPackage.Challenge exportChallenge(ChallengeEntity entity, Map<String, byte[]> assets) {
        validateIdentity(entity.getId(), "challenge ID");
        List<String> contextAssets = new ArrayList<>();
        Path folder = Paths.get(fileStorageService.getChallengeBasePath(entity.getId())).toAbsolutePath().normalize();
        if (Files.exists(folder, LinkOption.NOFOLLOW_LINKS)) {
            if (Files.isSymbolicLink(folder)) throw new IllegalArgumentException("Challenge folder cannot be a symbolic link: " + entity.getId());
            try {
                Files.walkFileTree(folder, new SimpleFileVisitor<>() {
                    @Override public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
                        if (dir.getFileName() != null && dir.getFileName().toString().equals(".git")) return FileVisitResult.SKIP_SUBTREE;
                        if (Files.isSymbolicLink(dir)) return FileVisitResult.SKIP_SUBTREE;
                        return FileVisitResult.CONTINUE;
                    }

                    @Override public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                        if (!attrs.isRegularFile() || Files.isSymbolicLink(file)) return FileVisitResult.CONTINUE;
                        String relative = folder.relativize(file).toString().replace(File.separatorChar, '/');
                        String path = "assets/challenges/" + entity.getId() + "/" + safeRelativePath(relative);
                        putAsset(assets, path, Files.readAllBytes(file));
                        contextAssets.add(path);
                        return FileVisitResult.CONTINUE;
                    }
                });
            } catch (IOException e) {
                throw new IllegalArgumentException("Could not read challenge files for " + entity.getId(), e);
            }
        }
        String downloadAsset = null;
        if (entity.getDownloadZip() != null) {
            String contextDownload = null;
            if (entity.getOriginalFilename() != null && !entity.getOriginalFilename().contains("/")
                    && !entity.getOriginalFilename().contains("\\")) {
                contextDownload = "assets/challenges/" + entity.getId() + "/files/" + entity.getOriginalFilename();
            }
            if (contextDownload != null && contextAssets.contains(contextDownload)
                    && Arrays.equals(assets.get(contextDownload), entity.getDownloadZip())) {
                downloadAsset = contextDownload;
            } else {
                downloadAsset = "assets/downloads/" + entity.getId() + ".bin";
                putAsset(assets, downloadAsset, entity.getDownloadZip());
            }
        }
        return new ContentTransferPackage.Challenge(entity.getId(), entity.getTitle(), entity.getTitleDe(),
                entity.getDescription(), entity.getDescriptionDe(), entity.getCategory(), entity.getDifficulty(),
                entity.getPoints(), entity.isRequiresInstance() ? null : entity.getFlag(), entity.isRequiresInstance(), entity.getOriginalFilename(),
                entity.getHintsJson(), entity.getHintsJsonDe(), entity.getDockerFilesJson(), downloadAsset, contextAssets);
    }

    private ContentTransferPackage.Course exportCourse(CourseEntity course) {
        validateIdentity(course.getSlug(), "course slug");
        List<ContentTransferPackage.Module> modules = course.getModules().stream()
                .sorted(Comparator.comparing(m -> Optional.ofNullable(m.getOrderIndex()).orElse(0)))
                .map(module -> {
                    if (module.getTransferKey() == null) {
                        module.setTransferKey(UUID.randomUUID().toString());
                        moduleRepository.save(module);
                    }
                    List<ContentTransferPackage.Lesson> lessons = module.getLessons().stream()
                            .sorted(Comparator.comparing(l -> Optional.ofNullable(l.getOrderIndex()).orElse(0)))
                            .map(lesson -> {
                                if (lesson.getTransferKey() == null) {
                                    lesson.setTransferKey(UUID.randomUUID().toString());
                                    lessonRepository.save(lesson);
                                }
                                return new ContentTransferPackage.Lesson(lesson.getTransferKey(), lesson.getTitle(),
                                        lesson.getTitleDe(), lesson.getContent(), lesson.getContentDe(),
                                        lesson.getDetailedExplanation(), lesson.getDetailedExplanationDe(), lesson.getVideoUrl(),
                                        lesson.getOrderIndex(), safeList(lesson.getChallengeIds()), safeList(lesson.getCodeExamplesJson()),
                                        safeList(lesson.getRealWorldIncidents()), safeList(lesson.getRealWorldIncidentsDe()),
                                        safeList(lesson.getExternalReferences()), safeList(lesson.getKeyTakeaways()),
                                        safeList(lesson.getKeyTakeawaysDe()));
                            }).toList();
                    return new ContentTransferPackage.Module(module.getTransferKey(), module.getTitle(), module.getTitleDe(),
                            module.getContent(), module.getContentDe(), module.getOrderIndex(), lessons);
                }).toList();
        return new ContentTransferPackage.Course(course.getSlug(), course.getTitle(), course.getTitleDe(),
                course.getDescription(), course.getDescriptionDe(), course.getDifficulty(), course.getEstimatedMinutes(),
                course.getOrderIndex(), modules);
    }

    private ParsedPackage parsePackage(byte[] archive) {
        if (archive == null || archive.length == 0 || archive.length > 50L * 1024 * 1024) {
            throw new IllegalArgumentException("Upload a valid content ZIP smaller than 50 MB.");
        }
        Map<String, byte[]> entries = new LinkedHashMap<>();
        long expanded = 0;
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(archive))) {
            ZipEntry entry;
            int count = 0;
            while ((entry = zip.getNextEntry()) != null) {
                if (++count > MAX_ARCHIVE_ENTRIES) throw new IllegalArgumentException("Package contains too many files.");
                if (entry.isDirectory()) continue;
                String name = safeArchivePath(entry.getName());
                if (!name.equals("manifest.json") && !name.startsWith("assets/")) {
                    throw new IllegalArgumentException("Unexpected file in content package: " + name);
                }
                ByteArrayOutputStream file = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int read;
                while ((read = zip.read(buffer)) != -1) {
                    expanded += read;
                    if (expanded > MAX_EXPANDED_BYTES) throw new IllegalArgumentException("Package expands beyond the 45 MB limit.");
                    file.write(buffer, 0, read);
                }
                if (entries.putIfAbsent(name, file.toByteArray()) != null) {
                    throw new IllegalArgumentException("Duplicate file in content package: " + name);
                }
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Could not read content ZIP.", e);
        }
        byte[] manifest = entries.remove("manifest.json");
        if (manifest == null) throw new IllegalArgumentException("Content package has no manifest.json.");
        try {
            ContentTransferPackage content = mapper.readValue(manifest, ContentTransferPackage.class);
            validatePackage(content, entries);
            return new ParsedPackage(content, entries);
        } catch (IOException e) {
            throw new IllegalArgumentException("Content package manifest is invalid.", e);
        }
    }

    private void validatePackage(ContentTransferPackage content, Map<String, byte[]> assets) {
        if (content == null || !FORMAT.equals(content.format()) || content.version() != VERSION) {
            throw new IllegalArgumentException("Unsupported content package format or version.");
        }
        Set<String> challengeIds = new HashSet<>();
        Set<String> referencedAssets = new HashSet<>();
        for (ContentTransferPackage.Challenge challenge : safeList(content.challenges())) {
            validateIdentity(challenge.id(), "challenge ID");
            requireText(challenge.title(), "challenge title");
            if (challenge.requiresInstance() && !challenge.id().matches("[a-z0-9][a-z0-9_.-]{0,62}")) {
                throw new IllegalArgumentException("Dynamic challenge ID is not supported by the environment service: " + challenge.id());
            }
            if (!challengeIds.add(challenge.id())) throw new IllegalArgumentException("Duplicate challenge ID: " + challenge.id());
            if (challenge.downloadAsset() != null) {
                if (!challenge.downloadAsset().equals("assets/downloads/" + challenge.id() + ".bin")
                        && !safeList(challenge.contextAssets()).contains(challenge.downloadAsset())) {
                    throw new IllegalArgumentException("Invalid download asset reference.");
                }
                requireAsset(challenge.downloadAsset(), assets, referencedAssets);
            }
            for (String path : safeList(challenge.contextAssets())) {
                String prefix = "assets/challenges/" + challenge.id() + "/";
                if (!path.startsWith(prefix)) throw new IllegalArgumentException("Challenge asset path does not match its ID.");
                safeArchivePath(path);
                requireAsset(path, assets, referencedAssets);
            }
            if (challenge.requiresInstance() && safeList(challenge.contextAssets()).stream().noneMatch(path ->
                    path.endsWith("/docker/Dockerfile") || path.endsWith("/docker/dockerfile")
                            || path.endsWith("/Dockerfile") || path.endsWith("/dockerfile"))) {
                throw new IllegalArgumentException("Dynamic challenge has no Dockerfile: " + challenge.id());
            }
        }
        Set<String> courseSlugs = new HashSet<>();
        Set<String> allModules = new HashSet<>();
        Set<String> allLessons = new HashSet<>();
        Set<String> categoryIds = new HashSet<>();
        for (ContentTransferPackage.Category category : safeList(content.categories())) {
            validateIdentity(category.id(), "category ID");
            requireText(category.name(), "category name");
            if (!categoryIds.add(category.id())) throw new IllegalArgumentException("Duplicate category ID.");
        }
        for (ContentTransferPackage.Course course : safeList(content.courses())) {
            validateIdentity(course.slug(), "course slug");
            requireText(course.title(), "course title");
            if (!courseSlugs.add(course.slug())) throw new IllegalArgumentException("Duplicate course slug: " + course.slug());
            for (ContentTransferPackage.Module module : safeList(course.modules())) {
                validateKey(module.key(), "module");
                requireText(module.title(), "module title");
                if (!allModules.add(module.key())) throw new IllegalArgumentException("Duplicate module key.");
                for (ContentTransferPackage.Lesson lesson : safeList(module.lessons())) {
                    validateKey(lesson.key(), "lesson");
                    requireText(lesson.title(), "lesson title");
                    if (!allLessons.add(lesson.key())) throw new IllegalArgumentException("Duplicate lesson key.");
                    for (String id : safeList(lesson.challengeIds())) {
                        validateIdentity(id, "challenge ID");
                        if (!challengeIds.contains(id)) throw new IllegalArgumentException("Course package is missing linked challenge: " + id);
                    }
                }
            }
        }
        if (safeList(content.challenges()).isEmpty() && safeList(content.courses()).isEmpty()) {
            throw new IllegalArgumentException("Content package is empty.");
        }
        if (!referencedAssets.containsAll(assets.keySet())) {
            throw new IllegalArgumentException("Package contains unreferenced assets.");
        }
    }

    private List<Conflict> conflicts(ContentTransferPackage content) {
        List<Conflict> result = new ArrayList<>();
        for (ContentTransferPackage.Challenge challenge : safeList(content.challenges())) {
            challengeRepository.findById(challenge.id()).ifPresent(existing -> result.add(
                    new Conflict("challenge", challenge.id(), existing.getTitle(), challenge.title())));
        }
        for (ContentTransferPackage.Course course : safeList(content.courses())) {
            courseRepository.findBySlug(course.slug()).ifPresent(existing -> result.add(
                    new Conflict("course", course.slug(), existing.getTitle(), course.title())));
        }
        return result;
    }

    private Map<String, String> validateDecisions(List<Conflict> conflicts, List<Decision> decisions) {
        Map<String, String> result = new HashMap<>();
        for (Decision decision : safeList(decisions)) {
            String type = decision.type() == null ? "" : decision.type().toLowerCase(Locale.ROOT);
            String action = decision.action() == null ? "" : decision.action().toUpperCase(Locale.ROOT);
            String key = type + ":" + decision.key();
            if (!(type.equals("challenge") || type.equals("course")) || !(action.equals("SKIP") || action.equals("UPDATE"))) {
                throw new IllegalArgumentException("Each conflict choice must be Skip or Update.");
            }
            if (result.putIfAbsent(key, action) != null) throw new IllegalArgumentException("Duplicate conflict choice.");
        }
        for (Conflict conflict : conflicts) {
            if (!result.containsKey(conflict.type() + ":" + conflict.key())) {
                throw new IllegalArgumentException("Choose Skip or Update for " + conflict.type() + " " + conflict.key() + ".");
            }
        }
        if (result.size() != conflicts.size()) throw new IllegalArgumentException("Choice provided for an item that has no conflict.");
        return result;
    }

    private List<FolderSwap> stageAndSwapFolders(List<ContentTransferPackage.Challenge> challenges, Map<String, byte[]> assets) {
        List<FolderSwap> swaps = new ArrayList<>();
        try {
            for (ContentTransferPackage.Challenge challenge : challenges) {
                Path target = Paths.get(fileStorageService.getChallengeBasePath(challenge.id())).toAbsolutePath().normalize();
                Path parent = target.getParent();
                Files.createDirectories(parent);
                String token = UUID.randomUUID().toString();
                Path staged = parent.resolve("." + challenge.id() + ".import-" + token);
                Path backup = parent.resolve("." + challenge.id() + ".backup-" + token);
                Files.createDirectories(staged.resolve("docker"));
                Files.createDirectories(staged.resolve("files"));
                swaps.add(new FolderSwap(target, staged, backup));
                for (String path : safeList(challenge.contextAssets())) {
                    String relative = path.substring(("assets/challenges/" + challenge.id() + "/").length());
                    Path file = staged.resolve(safeRelativePath(relative)).normalize();
                    if (!file.startsWith(staged)) throw new IllegalArgumentException("Invalid challenge asset path.");
                    Files.createDirectories(file.getParent());
                    Files.write(file, assets.get(path), StandardOpenOption.CREATE_NEW);
                }
            }
            for (FolderSwap swap : swaps) {
                if (Files.exists(swap.target(), LinkOption.NOFOLLOW_LINKS)) move(swap.target(), swap.backup());
                swap.setHadTarget(Files.exists(swap.backup(), LinkOption.NOFOLLOW_LINKS));
                move(swap.staged(), swap.target());
                swap.setInstalled(true);
            }
            return swaps;
        } catch (Exception e) {
            rollbackFolders(swaps);
            throw new IllegalArgumentException("Could not install challenge files.", e);
        }
    }

    private void registerFolderRollback(List<FolderSwap> swaps) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status == STATUS_COMMITTED) cleanupFolders(swaps);
                else rollbackFolders(swaps);
            }
        });
    }

    private void applyChallenge(ContentTransferPackage.Challenge item, ChallengeEntity entity, Map<String, byte[]> assets) {
        entity.setId(item.id()); entity.setTitle(item.title()); entity.setTitleDe(item.titleDe());
        entity.setDescription(item.description()); entity.setDescriptionDe(item.descriptionDe());
        entity.setCategory(item.category()); entity.setDifficulty(item.difficulty()); entity.setPoints(item.points());
        entity.setRequiresInstance(item.requiresInstance());
        entity.setFlag(item.requiresInstance() ? null : item.flag());
        entity.setOriginalFilename(item.originalFilename()); entity.setHintsJson(item.hintsJson());
        entity.setHintsJsonDe(item.hintsJsonDe()); entity.setDockerFilesJson(item.dockerFilesJson());
        entity.setDownloadZip(item.downloadAsset() == null ? null : assets.get(item.downloadAsset()));
    }

    private void applyCourse(ContentTransferPackage.Course item, CourseEntity course, boolean exists) {
        if (course.getModules() == null) course.setModules(new LinkedHashSet<>());
        course.setTitle(item.title()); course.setTitleDe(item.titleDe()); course.setDescription(item.description());
        course.setDescriptionDe(item.descriptionDe()); course.setSlug(item.slug()); course.setDifficulty(item.difficulty());
        course.setEstimatedMinutes(item.estimatedMinutes()); course.setOrderIndex(item.orderIndex() == null ? 0 : item.orderIndex());
        if (!exists) course.setIsPublished(false);
        Set<ModuleEntity> retainedModules = new LinkedHashSet<>();
        List<ModuleEntity> existingModules = new ArrayList<>(safeSet(course.getModules()));
        for (ContentTransferPackage.Module data : safeList(item.modules())) {
            ModuleEntity module = existingModules.stream().filter(m -> Objects.equals(m.getTransferKey(), data.key())).findFirst()
                    .orElseGet(() -> existingModules.stream().filter(m -> !retainedModules.contains(m) && Objects.equals(m.getTitle(), data.title())).findFirst()
                            .orElseGet(() -> existingModules.stream().filter(m -> !retainedModules.contains(m) && Objects.equals(m.getOrderIndex(), data.orderIndex())).findFirst()
                                    .orElseGet(ModuleEntity::new)));
            module.setCourse(course); module.setTransferKey(data.key()); module.setTitle(data.title());
            module.setTitleDe(data.titleDe()); module.setContent(data.content()); module.setContentDe(data.contentDe());
            module.setOrderIndex(data.orderIndex() == null ? 0 : data.orderIndex());
            if (module.getLessons() == null) module.setLessons(new LinkedHashSet<>());
            Set<LessonEntity> retainedLessons = new LinkedHashSet<>();
            List<LessonEntity> existingLessons = new ArrayList<>(safeSet(module.getLessons()));
            for (ContentTransferPackage.Lesson lessonData : safeList(data.lessons())) {
                LessonEntity lesson = existingLessons.stream().filter(l -> Objects.equals(l.getTransferKey(), lessonData.key())).findFirst()
                        .orElseGet(() -> existingLessons.stream().filter(l -> !retainedLessons.contains(l) && Objects.equals(l.getTitle(), lessonData.title())).findFirst()
                                .orElseGet(() -> existingLessons.stream().filter(l -> !retainedLessons.contains(l) && Objects.equals(l.getOrderIndex(), lessonData.orderIndex())).findFirst()
                                        .orElseGet(LessonEntity::new)));
                applyLesson(lessonData, lesson, module);
                retainedLessons.add(lesson);
            }
            existingLessons.stream().filter(lesson -> !retainedLessons.contains(lesson)).forEach(module.getLessons()::remove);
            module.getLessons().addAll(retainedLessons);
            retainedModules.add(module);
        }
        existingModules.stream().filter(module -> !retainedModules.contains(module)).forEach(course.getModules()::remove);
        course.getModules().addAll(retainedModules);
    }

    private void applyLesson(ContentTransferPackage.Lesson data, LessonEntity lesson, ModuleEntity module) {
        lesson.setModule(module); lesson.setTransferKey(data.key()); lesson.setTitle(data.title());
        lesson.setTitleDe(data.titleDe()); lesson.setContent(data.content()); lesson.setContentDe(data.contentDe());
        lesson.setDetailedExplanation(data.detailedExplanation()); lesson.setDetailedExplanationDe(data.detailedExplanationDe());
        lesson.setVideoUrl(data.videoUrl()); lesson.setOrderIndex(data.orderIndex() == null ? 0 : data.orderIndex());
        lesson.setChallengeIds(safeList(data.challengeIds())); lesson.setCodeExamplesJson(safeList(data.codeExamplesJson()));
        lesson.setRealWorldIncidents(safeList(data.realWorldIncidents())); lesson.setRealWorldIncidentsDe(safeList(data.realWorldIncidentsDe()));
        lesson.setExternalReferences(safeList(data.externalReferences())); lesson.setKeyTakeaways(safeList(data.keyTakeaways()));
        lesson.setKeyTakeawaysDe(safeList(data.keyTakeawaysDe()));
    }

    private void requireAsset(String path, Map<String, byte[]> assets, Set<String> references) {
        safeArchivePath(path);
        if (!assets.containsKey(path)) throw new IllegalArgumentException("Package is missing asset: " + path);
        references.add(path);
    }

    private void putAsset(Map<String, byte[]> assets, String path, byte[] bytes) {
        if (bytes == null) return;
        if (assets.values().stream().mapToLong(value -> value.length).sum() + bytes.length > MAX_EXPANDED_BYTES) {
            throw new IllegalArgumentException("Export exceeds the 45 MB expanded package limit.");
        }
        assets.put(path, bytes);
    }

    private static void putZipEntry(ZipOutputStream zip, String name, byte[] value) throws IOException {
        zip.putNextEntry(new ZipEntry(name)); zip.write(value); zip.closeEntry();
    }

    private static String safeArchivePath(String input) {
        if (input == null || input.isBlank() || input.startsWith("/") || input.contains("\\") || input.matches("^[A-Za-z]:.*")) {
            throw new IllegalArgumentException("Invalid package path.");
        }
        Path path = Paths.get(input).normalize();
        if (path.isAbsolute() || path.startsWith("..") || !path.toString().replace(File.separatorChar, '/').equals(input)) {
            throw new IllegalArgumentException("Invalid package path: " + input);
        }
        return input;
    }

    private static String safeRelativePath(String input) { return safeArchivePath(input); }

    private static void validateIdentity(String value, String label) {
        if (value == null || !value.matches("[A-Za-z0-9][A-Za-z0-9._-]{0,199}") || value.contains("..")) {
            throw new IllegalArgumentException("Invalid " + label + ".");
        }
    }

    private static void validateKey(String key, String label) {
        try { UUID.fromString(key); } catch (Exception e) { throw new IllegalArgumentException("Invalid " + label + " identity key."); }
    }

    private static void requireText(String value, String label) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException("Package is missing a " + label + ".");
    }

    private static <T> List<T> safeList(List<T> values) { return values == null ? List.of() : values; }
    private static <T> Set<T> safeSet(Set<T> values) { return values == null ? Set.of() : values; }
    private static <T> Set<T> safeSet(Collection<T> values) { return values == null ? Set.of() : new LinkedHashSet<>(values); }

    private static void move(Path from, Path to) throws IOException {
        try { Files.move(from, to, StandardCopyOption.ATOMIC_MOVE); }
        catch (AtomicMoveNotSupportedException e) { Files.move(from, to); }
    }

    private static void cleanupFolders(List<FolderSwap> swaps) {
        for (FolderSwap swap : swaps) {
            deleteTree(swap.backup()); deleteTree(swap.staged());
        }
    }

    private static void rollbackFolders(List<FolderSwap> swaps) {
        List<FolderSwap> reverse = new ArrayList<>(swaps); Collections.reverse(reverse);
        for (FolderSwap swap : reverse) {
            if (swap.installed()) deleteTree(swap.target());
            if (swap.hadTarget() && Files.exists(swap.backup(), LinkOption.NOFOLLOW_LINKS)) {
                try { move(swap.backup(), swap.target()); } catch (IOException ignored) { }
            }
            deleteTree(swap.staged());
        }
    }

    private static void deleteTree(Path path) {
        if (path == null || !Files.exists(path, LinkOption.NOFOLLOW_LINKS)) return;
        try {
            Files.walkFileTree(path, new SimpleFileVisitor<>() {
                @Override public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException { Files.deleteIfExists(file); return FileVisitResult.CONTINUE; }
                @Override public FileVisitResult postVisitDirectory(Path dir, IOException error) throws IOException { Files.deleteIfExists(dir); return FileVisitResult.CONTINUE; }
            });
        } catch (IOException ignored) { }
    }

    private record ParsedPackage(ContentTransferPackage content, Map<String, byte[]> assets) { }
    private static final class FolderSwap {
        private final Path target; private final Path staged; private final Path backup;
        private boolean hadTarget; private boolean installed;
        FolderSwap(Path target, Path staged, Path backup) { this.target = target; this.staged = staged; this.backup = backup; }
        Path target() { return target; } Path staged() { return staged; } Path backup() { return backup; }
        boolean hadTarget() { return hadTarget; } boolean installed() { return installed; }
        void setHadTarget(boolean value) { hadTarget = value; } void setInstalled(boolean value) { installed = value; }
    }

    public record ExportRequest(String mode, List<String> challengeIds, List<String> courseSlugs) { }
    public record Decision(String type, String key, String action) { }
    public record Conflict(String type, String key, String existingTitle, String incomingTitle) { }
    public record Preview(int challengeCount, int courseCount, List<Conflict> conflicts) { }
    public record ImportResult(int challengesCreated, int challengesUpdated, int coursesCreated,
                               int coursesUpdated, int skipped) { }
}
