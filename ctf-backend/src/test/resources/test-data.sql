-- =====================================================================
-- CLEANUP (respect foreign keys)
-- =====================================================================
-- Order matters: solves depends on challenges, which depend on categories/files
DELETE FROM solves;
DELETE FROM challenges;
DELETE FROM file_entity;
DELETE FROM category_entity;

-- =====================================================================
-- CATEGORY DATA
-- =====================================================================
INSERT INTO category_entity (id, name, summary, file_url) VALUES
                                                              ('web', 'Web Exploitation', 'Challenges about HTTP, auth, input validation, and server-side bugs.', 'https://example.com/web-tools.zip'),
                                                              ('crypto', 'Cryptography', 'Classical and modern crypto tasks: XOR, RSA, padding oracles.', 'https://example.com/crypto-handbook.pdf'),
                                                              ('forensics', 'Forensics', 'PCAP analysis, file carving, metadata tricks.', 'https://example.com/forensics-starter-kit.zip');

-- =====================================================================
-- FILE DATA
-- =====================================================================
INSERT INTO file_entity (id, file_name, content) VALUES
                                                     ('file-web-01', 'web_hints.txt', decode('48656c6c6f20576f726c64', 'hex')),
                                                     ('file-crypto-01', 'crypto_intro.pdf', decode('43544620546573742044617461', 'hex')),
                                                     ('file-for-01', 'pcap_sample.pcap', decode('5043415020646174612068657265', 'hex'));

-- =====================================================================
-- CHALLENGE DATA
-- =====================================================================
INSERT INTO challenges (id, title, description, category, difficulty, points, download_file, flag) VALUES
                                                                                                      ('web-101', 'Intro to Web Exploitation', 'Basic XSS challenge for beginners.', 'web', 'EASY', 100, decode('504b0304', 'hex'), 'flag{leet_xss}'),
                                                                                                      ('crypto-rsa-ct', 'RSA: Common Modulus', 'Two ciphertexts, one modulus, different exponents. Recover the message.', 'crypto', 'HARD', 400, decode('504b0304', 'hex'), 'CTF{BEZOUT_TO_THE_RESQUE}');

-- =====================================================================
-- SOLVE DATA (newly managed by Hibernate via SolveEntity)
-- =====================================================================
INSERT INTO solves (username, challenge_id, points_earned) VALUES
                                                               ('alice', 'web-101', 100),
                                                               ('bob', 'web-101', 100);
