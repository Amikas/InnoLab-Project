package at.fhtw.ctfbackend.bootstrap;

import at.fhtw.ctfbackend.entity.CategoryEntity;
import at.fhtw.ctfbackend.repository.CategoryRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@Configuration
public class CategorySeeder {

    private static final Logger logger = LoggerFactory.getLogger(CategorySeeder.class);

    @Bean
    CommandLineRunner loadCategories(CategoryRepository repo) {
        return args -> {
            if (repo.count() > 0) {
                logger.info("Categories already exist, skipping initialization.");
                return;
            }

            List<CategoryEntity> categories = List.of(
                    withDe(new CategoryEntity("cryptography", "Cryptography", "Learn cryptographic fundamentals and techniques.", ""),
                            "Kryptografie", "Lernen Sie kryptografische Grundlagen und Techniken."),
                    withDe(new CategoryEntity("web-exploitation", "Web-Exploitation", "Discover and exploit web application vulnerabilities.", ""),
                            "Web-Exploitation", "Entdecken und nutzen Sie Schwachstellen in Webanwendungen aus."),
                    withDe(new CategoryEntity("binary-exploitation", "Binary-Exploitation", "Exploit memory corruption vulnerabilities in binaries.", ""),
                            "Binary-Exploitation", "Nutzen Sie Speichermanipulations-Schwachstellen in Binärdateien aus."),
                    withDe(new CategoryEntity("forensics", "Forensics", "Investigate digital evidence and recover hidden data.", ""),
                            "Forensik", "Untersuchen Sie digitale Beweise und stellen Sie verborgene Daten wieder her."),
                    withDe(new CategoryEntity("reverse-engineering", "Reverse Engineering", "Analyze binaries and understand compiled code.", ""),
                            "Reverse Engineering", "Analysieren Sie Binärdateien und verstehen Sie kompilierten Code.")
            );

            repo.saveAll(categories);
            logger.info("Initialized {} categories.", categories.size());
        };
    }

    private static CategoryEntity withDe(CategoryEntity e, String nameDe, String summaryDe) {
        e.setNameDe(nameDe);
        e.setSummaryDe(summaryDe);
        return e;
    }
}
