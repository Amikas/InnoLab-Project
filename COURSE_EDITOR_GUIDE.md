# Course Editor Guide

A comprehensive guide for creating high-quality lessons on the InnoLab CTF Platform.

---

## 1. Lesson Structure Template

Every lesson should follow this structure:

### Required Sections

1. **Title** - Clear, specific topic (e.g., "SQL Injection Fundamentals")
2. **Theory** - Brief introduction (2-3 paragraphs)
3. **In-Depth Analysis** - Detailed explanation with:
   - Vulnerable code example (BAD)
   - Secure code example (GOOD)
   - Attack demonstrations
   - Prevention methods
4. **Real-World Incidents** - At least 3 references to actual breach
5. **External References** - Links to further reading

---

## 2. Writing Standards

### Language Guidelines

- Use **clear, instructional language**
- Write in **second person** ("You will learn...", "When an attacker...")
- Explain **WHY** something is vulnerable, not just **WHAT**
- Always provide **mitigation/prevention tips**

### Code Examples

Every lesson with code should include:

1. **Vulnerable (BAD) example** - Show what's wrong
2. **Secure (GOOD) example** - Show the fix
3. **Language tags** - Use proper class names:
   ```html
   <pre><code class="language-php">...</code></pre>
   <pre><code class="language-python">...</code></pre>
   <pre><code class="language-sql">...</code></pre>
   ```

### Supported Languages

| Tag | Language |
|-----|----------|
| `language-php` | PHP |
| `language-python` | Python |
| `language-sql` | SQL |
| `language-js` / `language-javascript` | JavaScript |
| `language-bash` / `language-sh` | Bash/Shell |
| `language-c` | C |
| `language-java` | Java |
| `language-ruby` | Ruby |
| `language-go` | Go |
| `language-html` | HTML |
| `language-css` | CSS |
| `language-json` | JSON |
| `language-yaml` | YAML |

---

## 3. Code Example Format

### Structure Your Code Like This

```
<h3>Vulnerable Code Example</h3>
<pre><code class="language-php">// NEVER USE THIS - VULNERABLE CODE
$username = $_GET['username'];
$query = "SELECT * FROM users WHERE username='$username'";
$result = mysqli_query($conn, $query);</code></pre>

<h3>Secure Code Example</h3>
<pre><code class="language-php">// SECURE - Using Prepared Statements
$stmt = $mysqli->prepare("SELECT * FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();</code></pre>
```

### Best Practices

- Add **comments** in code explaining what each line does
- Use **realistic variable names**
- Show **complete, runnable examples** when possible
- Include **what the attacker can do** with the vulnerable code

---

## 4. Real-World Incidents

Include at least one real security incident per lesson.

### Examples

```java
List.of(
    "2017 Equifax Breach - 147 million people affected due to SQL injection",
    "Heartland Payment Systems - 130 million credit cards stolen via SQL injection",
    "2019 Capital One - AWS misconfiguration led to data breach"
)
```

### Where to Find Incidents

- **CVE Database**: https://cve.mitre.org/
- **OWASP**: https://owasp.org/
- **Security News**: Krebs on Security, The Hacker News
- **Company Breach Reports**: Check official disclosures

### Format

```
"[Year] [Company/Organization] - [Brief description of impact]"
```

---

## 5. External References

Add authoritative links for further reading.

### Examples

```java
List.of(
    "https://owasp.org/www-community/attacks/SQL_Injection",
    "https://portswigger.net/web-security/sql-injection",
    "https://www.owasp.org/index.php/SQL_Injection_Prevention_Cheat_Sheet"
)
```

### Guidelines

- Prefer **official documentation** (OWASP, Mozilla, etc.)
- Include **vendor documentation** when relevant
- Add **tutorial links** for hands-on learning

---

## 6. Challenge Linking

Link lessons to relevant CTF challenges.

### How to Link

1. Create or identify the challenge in the system
2. Note the challenge ID
3. Add to lesson's `challengeIds` field

### Example

If challenge ID is `1`, add:
```json
["1"]
```

Multiple challenges:
```json
["1", "2", "3"]
```

---

## 7. Lesson Creation Checklist

Before publishing a lesson, verify:

- [ ] Title is clear and specific
- [ ] Theory section explains the concept briefly
- [ ] At least one vulnerable code example
- [ ] At least one secure code example
- [ ] Explanation of WHY the vulnerable code is dangerous
- [ ] Prevention/mitigation methods provided
- [ ] At least one real-world incident included
- [ ] At least one external reference link
- [ ] Code blocks use proper language tags
- [ ] Linked challenges exist and are accessible

---

## 8. Example Lesson: SQL Injection

Here's a complete example of a well-structured lesson:

### Title
SQL Injection Fundamentals

### Theory
SQL Injection is a code injection technique that exploits security vulnerabilities in an application's database layer. This occurs when user input is incorrectly filtered or not strongly typed.

### In-Depth Analysis

**What is SQL Injection?**
[Explain the vulnerability]

**Vulnerable Code:**
```php
// VULNERABLE - NEVER USE
$username = $_GET['username'];
$query = "SELECT * FROM users WHERE username='$username'";
```

**Attack Example:**
```
' OR '1'='1
```

**Prevention - Parameterized Queries:**
```php
// SECURE
$stmt = $mysqli->prepare("SELECT * FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
```

### Real-World Incidents
- 2017 Equifax Breach - 147 million people affected

### External References
- https://owasp.org/www-community/attacks/SQL_Injection

---

## 9. Tips for Great Lessons

1. **Start with the basics** - Build understanding before complexity
2. **Use analogies** - Relate concepts to everyday examples
3. **Show, don't just tell** - Code examples are crucial
4. **Connect to real events** - Real incidents make it memorable
5. **Provide a path forward** - Link to challenges, further reading

---

## Questions?

If you need help:
- Review existing lessons for examples
- Check OWASP for authoritative content
- Look at CVE databases for incident references

---

*Last updated: 2026-04-04*
