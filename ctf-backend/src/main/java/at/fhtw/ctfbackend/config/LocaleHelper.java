package at.fhtw.ctfbackend.config;

/** Small helper for bilingual (en/de) content with English fallback. */
public final class LocaleHelper {
    private LocaleHelper() {}

    public static boolean isGerman(String lang) {
        if (lang == null) return false;
        String base = lang.split(",")[0].split("-")[0].split("_")[0].trim().toLowerCase();
        return base.equals("de");
    }

    public static boolean isGerman(java.util.Locale locale) {
        return locale != null && "de".equalsIgnoreCase(locale.getLanguage());
    }

    public static String pick(String en, String de, String lang) {
        if (isGerman(lang) && de != null && !de.isBlank()) return de;
        return en;
    }
}
