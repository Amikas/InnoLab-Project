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
                    new CategoryEntity("cryptography", "Cryptography", "Learn cryptographic fundamentals and techniques.", ""),
                    new CategoryEntity("web-exploitation", "Web-Exploitation", "Discover and exploit web application vulnerabilities.", ""),
                    new CategoryEntity("binary-exploitation", "Binary-Exploitation", "Exploit memory corruption vulnerabilities in binaries.", ""),
                    new CategoryEntity("forensics", "Forensics", "Investigate digital evidence and recover hidden data.", ""),
                    new CategoryEntity("reverse-engineering", "Reverse Engineering", "Analyze binaries and understand compiled code.", "")
            );

            repo.saveAll(categories);
            System.out.println("Initialized " + categories.size() + " categories.");
        };
    }

// Course seeding removed - use seed-courses.sh script instead
//    @Bean
//    CommandLineRunner loadCourses(CourseRepository courseRepo) {
//        return args -> {
//            if (courseRepo.count() > 0) {
//                System.out.println("Courses already exist, skipping initialization.");
//                return;
//            }
//
//            List<CourseEntity> courses = createSampleCourses();
//            courseRepo.saveAll(courses);
//            System.out.println("Initialized " + courses.size() + " courses.");
//        };
//    }

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
                createLesson(
                    "SQL Injection Fundamentals", 
                    "<h2>What is SQL Injection?</h2><p>SQL Injection is a code injection technique that exploits security vulnerabilities in an application's database layer. This occurs when user input is incorrectly filtered or not strongly typed.</p><p>In this lesson, you'll learn how SQL injection works, how to identify vulnerable code, and most importantly — how to prevent it.</p>",
                    "<h2>Understanding SQL Injection</h2><p>SQL Injection is a code injection attack that targets applications using SQL databases. It occurs when user-supplied data is included in an SQL query without proper sanitization or parameterization.</p><h3>The Attack Vector</h3><p>An attacker manipulates the input data to interfere with the logic of the original SQL query. This can lead to unauthorized access to data, modification of data, or even execution of system commands on the database server.</p><h3>Why It Matters</h3><ul><li><strong>OWASP Top 10</strong>: SQL Injection has been in the top 3 since the list's inception</li><li><strong>Real-World Impact</strong>: Major breaches at Sony, Yahoo, and Equifax involved SQL injection</li><li><strong>Ease of Exploitation</strong>: Can be discovered with simple testing</li></ul><h3>Vulnerable Code Example</h3><pre><code class=\"language-php\">// VULNERABLE CODE - NEVER USE THIS\n$username = $_GET['username'];\n$password = $_GET['password'];\n\n$query = \"SELECT * FROM users WHERE username='$username' AND password='$password'\";\n$result = mysqli_query($conn, $query);</code></pre><p>Notice how the user input is directly concatenated into the SQL query string. This is a critical security flaw.</p><h3>The Attack</h3><p>By entering the following as username:</p><pre><code>' OR '1'='1</code></pre><p>The resulting query becomes:</p><pre><code class=\"language-sql\">SELECT * FROM users WHERE username='' OR '1'='1' AND password=''</code></pre><p>Since <code>'1'='1'</code> is always true, the attacker gains access without valid credentials!</p><h3>Even More Dangerous: UNION-Based Injection</h3><p>Attackers can use UNION to extract data from other tables:</p><pre><code class=\"language-sql\">' UNION SELECT username, password, 1 FROM admin_users--</code></pre><p>This could return all admin credentials to the attacker.</p><h3>Detection Techniques</h3><ol><li><strong>Error-Based</strong>: Inject characters that cause SQL errors (e.g., <code>'</code>, <code>\"</code>)</li><li><strong>Boolean-Based</strong>: Test with <code>' OR 1=1--</code> vs <code>' OR 1=2--</code></li><li><strong>Time-Based</strong>: Use <code>'; SLEEP(5)--</code> to detect vulnerability</li></ol><h3>Real-World Example: The Equifax Breach</h3><p>In 2017, Equifax suffered a breach affecting 147 million people. While the exact attack vector varied, SQL injection vulnerabilities in their web application portal allowed attackers to access sensitive personal data.</p><h3>Prevention: Parameterized Queries</h3><p>The golden rule: <strong>never concatenate user input directly into SQL queries</strong>.</p><pre><code class=\"language-php\">// SECURE CODE - Using Prepared Statements\n$stmt = $mysqli->prepare(\"SELECT * FROM users WHERE username = ? AND password = ?\");\n$stmt->bind_param(\"ss\", $username, $password);\n$stmt->execute();</code></pre><p>The <code>?</code> placeholders are escaped automatically, preventing injection.</p><h3>Prevention: Stored Procedures</h3><pre><code class=\"language-sql\">CREATE PROCEDURE login_user(IN username VARCHAR(50), IN password VARCHAR(50))\nBEGIN\n    SELECT * FROM users WHERE username = username AND password = password;\nEND;</code></pre><h3>Prevention: Input Validation</h3><pre><code class=\"language-php\">// Whitelist validation\n$username = preg_replace('/[^a-zA-Z0-9_]/', '', $username);\n\nif (strlen($username) > 50) {\n    die(\"Username too long\");\n}</code></pre><h3>Prevention: ORM Usage</h3><p>Modern ORMs like Entity Framework, SQLAlchemy, or Hibernate handle parameterization automatically:</p><pre><code class=\"language-python\"># SQLAlchemy - Secure by default\nuser = session.query(User).filter_by(\n    username=username,\n    password=password\n).first()</code></pre><h3>Defense in Depth</h3><ul><li><strong>Least Privilege</strong>: Database users should have minimal permissions</li><li><strong>Web Application Firewall (WAF)</strong>: Can block known attack patterns</li><li><strong>Regular Audits</strong>: Automated tools like SQLMap for testing</li></ul><h3>Tools for Testing</h3><ul><li><strong>SQLMap</strong>: Automated SQL injection detection and exploitation</li><li><strong>Burp Suite</strong>: Web vulnerability scanner</li><li><strong>OWASP ZAP</strong>: Free security testing tool</li></ul><h3>Summary</h3><p>SQL Injection is one of the most dangerous and common web vulnerabilities. The key takeaways:</p><ol><li>Always use parameterized queries/prepared statements</li><li>Validate and sanitize user input</li><li>Apply the principle of least privilege to database accounts</li><li>Use WAFs as an additional layer of defense</li><li>Regular security testing and code reviews</li></ol>",
                    0,
                    List.of(
                        "2017 Equifax Breach - 147 million people affected due to SQL injection in web portal",
                        "2009 Heartland Payment Systems - SQL injection led to 130 million credit cards stolen",
                        "2012 Yahoo! - 450,000 accounts exposed through SQL injection"
                    ),
                    List.of(
                        "https://owasp.org/www-community/attacks/SQL_Injection",
                        "https://portswigger.net/web-security/sql-injection",
                        "https://www.owasp.org/index.php/SQL_Injection_Prevention_Cheat_Sheet"
                    )
                ),
                createLesson("Cross-Site Scripting (XSS)", "<h2>Understanding XSS</h2><p>XSS allows attackers to inject malicious scripts into web pages.</p>", "<h3>Types of XSS</h3><ul><li><strong>Reflected XSS</strong>: Malicious script is part of the request</li><li><strong>Stored XSS</strong>: Malicious script is stored on the server</li><li><strong>DOM-based XSS</strong>: Client-side code modifies the DOM</li></ul>", 1),
                createLesson("Command Injection", "<h2>Command Injection</h2><p>When applications pass unsafe user input to system shells.</p>", "<h3>Prevention</h3><p>Always use parameterized commands and avoid shell execution with user input.</p>", 2)
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
                .detailedExplanation("")
                .orderIndex(orderIndex)
                .build();
    }

    private LessonEntity createLesson(String title, String content, String detailedExplanation, int orderIndex) {
        return LessonEntity.builder()
                .title(title)
                .content(content)
                .detailedExplanation(detailedExplanation)
                .orderIndex(orderIndex)
                .realWorldIncidents(List.of())
                .externalReferences(List.of())
                .build();
    }

    private LessonEntity createLesson(String title, String content, String detailedExplanation, int orderIndex, List<String> realWorldIncidents, List<String> externalReferences) {
        return LessonEntity.builder()
                .title(title)
                .content(content)
                .detailedExplanation(detailedExplanation)
                .orderIndex(orderIndex)
                .realWorldIncidents(realWorldIncidents)
                .externalReferences(externalReferences)
                .build();
    }
}
