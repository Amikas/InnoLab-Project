package at.fhtw.ctfbackend.dto;

import java.util.List;

/** Versioned, environment-independent content format stored inside a ZIP file. */
public record ContentTransferPackage(
        String format,
        int version,
        List<Category> categories,
        List<Challenge> challenges,
        List<Course> courses) {

    public record Category(String id, String name, String summary, String nameDe, String summaryDe, String fileUrl) { }

    public record Challenge(
            String id, String title, String titleDe, String description, String descriptionDe,
            String category, String difficulty, Integer points, String flag, boolean requiresInstance,
            String originalFilename, String hintsJson, String hintsJsonDe, String dockerFilesJson,
            String downloadAsset, List<String> contextAssets) { }

    public record Course(
            String slug, String title, String titleDe, String description, String descriptionDe,
            String difficulty, Integer estimatedMinutes, Integer orderIndex, List<Module> modules) { }

    public record Module(
            String key, String title, String titleDe, String content, String contentDe,
            Integer orderIndex, List<Lesson> lessons) { }

    public record Lesson(
            String key, String title, String titleDe, String content, String contentDe,
            String detailedExplanation, String detailedExplanationDe, String videoUrl, Integer orderIndex,
            List<String> challengeIds, List<String> codeExamplesJson, List<String> realWorldIncidents,
            List<String> realWorldIncidentsDe, List<String> externalReferences,
            List<String> keyTakeaways, List<String> keyTakeawaysDe) { }
}
