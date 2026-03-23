package at.fhtw.ctfbackend.config;

import at.fhtw.ctfbackend.entity.CategoryEntity;
import at.fhtw.ctfbackend.entity.ChallengeEntity;
import at.fhtw.ctfbackend.entity.CourseEntity;
import at.fhtw.ctfbackend.entity.ModuleEntity;
import at.fhtw.ctfbackend.entity.LessonEntity;
import at.fhtw.ctfbackend.repository.CategoryRepository;
import at.fhtw.ctfbackend.repository.ChallengeRepository;
import at.fhtw.ctfbackend.repository.CourseRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Configuration
public class DataLoader {

    private static final Map<String, String> FLAGS = Map.of(
            "web-101", "flag{leet_xss}",
            "rev-201", "flag{reverse_master}"
    );

    private static final Map<String, String> TITLES = Map.of(
            "web-101", "Basic Web Exploit",
            "rev-201", "Reverse Engineering Task"
    );

    private static final Map<String, String> DESCRIPTIONS = Map.of(
            "web-101", "Find the flag hidden in the login form.",
            "rev-201", "Analyze the binary and extract the flag."
    );

    private static final Map<String, String> CATEGORIES = Map.of(
            "web-101", "web-exploitation",
            "rev-201", "reverse-engineering"
    );

    private static final Map<String, String> DIFFICULTIES = Map.of(
            "web-101", "easy",
            "rev-201", "medium"
    );

    private static final Map<String, Integer> POINTS = Map.of(
            "web-101", 100,
            "rev-201", 200
    );

    @Bean
    CommandLineRunner initDatabase(ChallengeRepository repo) {
        return args -> {
            var resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath:/files/*.zip");

            System.out.println("=== LOADING CHALLENGES ===");
            System.out.println("Found " + resources.length + " ZIP files to load");

            for (Resource r : resources) {
                String filename = r.getFilename();
                String id = filename.replace(".zip", "");

                System.out.println("Processing: " + filename + " -> ID: " + id);

                if (repo.existsById(id)) {
                    System.out.println("  -> Already exists, skipping");
                    continue;
                }

                byte[] zipBytes;
                try (InputStream in = r.getInputStream()) {
                    zipBytes = in.readAllBytes();
                }

                System.out.println("  -> Read " + zipBytes.length + " bytes");

                ChallengeEntity entity = new ChallengeEntity(
                        id,
                        TITLES.getOrDefault(id, id),
                        DESCRIPTIONS.getOrDefault(id, ""),
                        CATEGORIES.getOrDefault(id, "web-exploitation"),
                        DIFFICULTIES.getOrDefault(id, "easy"),
                        POINTS.getOrDefault(id, 100),
                        zipBytes,
                        FLAGS.getOrDefault(id, "")
                );

                entity.setOriginalFilename(filename);
                System.out.println("  -> Set originalFilename: " + filename);

                repo.save(entity);
                System.out.println("  -> Saved successfully");
            }

            System.out.println("=== VERIFICATION ===");
            repo.findAll().forEach(c -> {
                String fileStatus = c.getDownload() != null ?
                        c.getDownload().length + " bytes" : "NULL";
                System.out.println("Challenge: " + c.getId() +
                        " | Title: " + c.getTitle() +
                        " | Filename: " + c.getOriginalFilename() +
                        " | File: " + fileStatus);
            });
            System.out.println("=== LOADING COMPLETE ===");
        };
    }

    @Bean
    CommandLineRunner loadCategories(CategoryRepository repo) {
        return args -> {
            if (repo.count() > 0) {
                System.out.println("Categories already exist, skipping initialization.");
                return;
            }

            List<CategoryEntity> categories = List.of(
                    new CategoryEntity("crypto", "Cryptography", "Learn cryptographic fundamentals and techniques.", ""),
                    new CategoryEntity("web", "Web-Exploitation", "Discover and exploit web application vulnerabilities.", ""),
                    new CategoryEntity("pwn", "Binary-Exploitation", "Exploit memory corruption vulnerabilities in binaries.", ""),
                    new CategoryEntity("forensics", "Forensics", "Investigate digital evidence and recover hidden data.", ""),
                    new CategoryEntity("rev", "Reverse Engineering", "Analyze binaries and understand compiled code.", "")
            );

            repo.saveAll(categories);
            System.out.println("Initialized " + categories.size() + " categories.");
        };
    }

    @Bean
    CommandLineRunner loadCourses(CourseRepository courseRepo) {
        return args -> {
            if (courseRepo.count() > 0) {
                System.out.println("Courses already exist, skipping initialization.");
                return;
            }

            List<CourseEntity> courses = createSampleCourses();
            courseRepo.saveAll(courses);
            System.out.println("Initialized " + courses.size() + " courses.");
        };
    }

    private List<CourseEntity> createSampleCourses() {
        List<CourseEntity> courses = new ArrayList<>();

        CourseEntity cryptoCourse = CourseEntity.builder()
                .title("Cryptography Fundamentals")
                .description("Master classical and modern cryptographic techniques from Caesar ciphers to RSA encryption.")
                .slug("cryptography")
                .difficulty("Beginner")
                .estimatedMinutes(480)
                .orderIndex(0)
                .isPublished(true)
                .build();

        ModuleEntity cryptoMod1 = createModule(cryptoCourse, "Introduction to Cryptography", 0, List.of(
                createLesson("What is Cryptography?", "Cryptography is the practice and study of techniques for secure communication in the presence of third parties.", 0),
                createLesson("History of Encryption", "From ancient Caesar ciphers to modern encryption, trace the evolution of secret writing.", 1),
                createLesson("Key Concepts: Encryption vs Encoding", "Understand the fundamental difference between encryption and encoding.", 2)
        ));

        ModuleEntity cryptoMod2 = createModule(cryptoCourse, "Symmetric Encryption", 1, List.of(
                createLesson("Block Ciphers", "Learn about AES, DES, and how block ciphers work.", 0),
                createLesson("Stream Ciphers", "Understand RC4 and stream cipher principles.", 1),
                createLesson("Practice: Breaking Weak Encryption", "Apply your knowledge to break simple encryption schemes.", 2)
        ));

        cryptoCourse.setModules(Set.of(cryptoMod1, cryptoMod2));
        courses.add(cryptoCourse);

        CourseEntity webCourse = CourseEntity.builder()
                .title("Web Application Security")
                .description("Discover and exploit common web vulnerabilities including SQL injection, XSS, and CSRF.")
                .slug("web-exploitation")
                .difficulty("Intermediate")
                .estimatedMinutes(600)
                .orderIndex(1)
                .isPublished(true)
                .build();

        ModuleEntity webMod1 = createModule(webCourse, "Web Fundamentals", 0, List.of(
                createLesson("How Web Applications Work", "Understand HTTP, cookies, sessions, and the client-server model.", 0),
                createLesson("HTML & JavaScript Basics", "Essential web technologies for understanding vulnerabilities.", 1),
                createLesson("The OWASP Top 10", "Overview of the most critical web application security risks.", 2)
        ));

        ModuleEntity webMod2 = createModule(webCourse, "Injection Attacks", 1, List.of(
                createLesson("SQL Injection Fundamentals", "Learn how attackers manipulate database queries.", 0),
                createLesson("Cross-Site Scripting (XSS)", "Understand and exploit XSS vulnerabilities.", 1),
                createLesson("Command Injection", "How to inject and execute system commands.", 2)
        ));

        webCourse.setModules(Set.of(webMod1, webMod2));
        courses.add(webCourse);

        CourseEntity pwnCourse = CourseEntity.builder()
                .title("Binary Exploitation")
                .description("Learn to exploit memory corruption vulnerabilities including buffer overflows and ROP chains.")
                .slug("binary-exploitation")
                .difficulty("Advanced")
                .estimatedMinutes(720)
                .orderIndex(2)
                .isPublished(true)
                .build();

        ModuleEntity pwnMod1 = createModule(pwnCourse, "Memory Basics", 0, List.of(
                createLesson("Understanding Memory Layout", "Stack, heap, registers, and memory addressing.", 0),
                createLesson("Introduction to Assembly", "Basic x86/x64 assembly instructions for exploitation.", 1),
                createLesson("GDB and Debugging", "Using GDB to analyze program execution.", 2)
        ));

        ModuleEntity pwnMod2 = createModule(pwnCourse, "Buffer Overflows", 1, List.of(
                createLesson("Stack Buffer Overflows", "Overwrite return addresses and control execution.", 0),
                createLesson("Return-Oriented Programming (ROP)", "Chaining existing code fragments to bypass protections.", 1),
                createLesson("Stack Canaries & ASLR", "Understanding and bypassing common protections.", 2)
        ));

        pwnCourse.setModules(Set.of(pwnMod1, pwnMod2));
        courses.add(pwnCourse);

        CourseEntity forensicsCourse = CourseEntity.builder()
                .title("Digital Forensics")
                .description("Investigate digital evidence, analyze file systems, and recover hidden data.")
                .slug("forensics")
                .difficulty("Intermediate")
                .estimatedMinutes(540)
                .orderIndex(3)
                .isPublished(true)
                .build();

        ModuleEntity forensicsMod1 = createModule(forensicsCourse, "Forensics Fundamentals", 0, List.of(
                createLesson("Digital Evidence Overview", "Types of digital evidence and where to find them.", 0),
                createLesson("File System Analysis", "Understanding NTFS, ext4, and file system forensics.", 1),
                createLesson("Memory Forensics", "Analyzing volatile memory dumps for artifacts.", 2)
        ));

        ModuleEntity forensicsMod2 = createModule(forensicsCourse, "Data Recovery", 1, List.of(
                createLesson("Deleted File Recovery", "Techniques for recovering deleted files.", 0),
                createLesson("Steganography Detection", "Finding hidden data in images and files.", 1),
                createLesson("Network Forensics", "Analyzing network captures for evidence.", 2)
        ));

        forensicsCourse.setModules(Set.of(forensicsMod1, forensicsMod2));
        courses.add(forensicsCourse);

        CourseEntity revCourse = CourseEntity.builder()
                .title("Reverse Engineering")
                .description("Analyze binaries, understand assembly code, and reverse engineer software.")
                .slug("reverse-engineering")
                .difficulty("Advanced")
                .estimatedMinutes(660)
                .orderIndex(4)
                .isPublished(true)
                .build();

        ModuleEntity revMod1 = createModule(revCourse, "Reverse Engineering Basics", 0, List.of(
                createLesson("Disassemblers and Decompilers", "Tools of the trade: IDA, Ghidra, and Radare2.", 0),
                createLesson("Understanding Executables", "PE, ELF, and Mach-O file formats.", 1),
                createLesson("Static vs Dynamic Analysis", "When to use each approach.", 2)
        ));

        ModuleEntity revMod2 = createModule(revCourse, "Advanced Reversing", 1, List.of(
                createLesson("Obfuscation Techniques", "Packing, anti-debugging, and code obfuscation.", 0),
                createLesson("Cracking Software Protections", "Bypassing license checks and DRM.", 1),
                createLesson("Malware Analysis", "Analyzing malicious software safely.", 2)
        ));

        revCourse.setModules(Set.of(revMod1, revMod2));
        courses.add(revCourse);

        return courses;
    }

    private ModuleEntity createModule(CourseEntity course, String title, int orderIndex, List<LessonEntity> lessons) {
        ModuleEntity module = ModuleEntity.builder()
                .course(course)
                .title(title)
                .orderIndex(orderIndex)
                .build();

        List<LessonEntity> lessonsWithModule = new ArrayList<>();
        for (LessonEntity lesson : lessons) {
            lesson.setModule(module);
            lessonsWithModule.add(lesson);
        }

        module.setLessons(new LinkedHashSet<>(lessonsWithModule));
        return module;
    }

    private LessonEntity createLesson(String title, String content, int orderIndex) {
        return LessonEntity.builder()
                .title(title)
                .content(content)
                .orderIndex(orderIndex)
                .build();
    }
}
