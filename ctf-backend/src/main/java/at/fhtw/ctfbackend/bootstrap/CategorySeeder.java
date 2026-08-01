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
                    new CategoryEntity("cryptography", "Cryptography", "Learn cryptographic fundamentals and techniques.", ""),
                    new CategoryEntity("web-exploitation", "Web-Exploitation", "Discover and exploit web application vulnerabilities.", ""),
                    new CategoryEntity("binary-exploitation", "Binary-Exploitation", "Exploit memory corruption vulnerabilities in binaries.", ""),
                    new CategoryEntity("forensics", "Forensics", "Investigate digital evidence and recover hidden data.", ""),
                    new CategoryEntity("reverse-engineering", "Reverse Engineering", "Analyze binaries and understand compiled code.", "")
            );

            repo.saveAll(categories);
            logger.info("Initialized {} categories.", categories.size());
        };
    }
}
