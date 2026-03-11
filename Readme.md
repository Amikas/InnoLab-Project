

# InnoLab CTF Platform

A Capture-the-Flag (CTF) training platform designed for **FH Technikum Wien students**.
The project provides an environment where users can practice cybersecurity skills through categorized challenges with different difficulties.

---


## Getting Started

### Prerequisites

* Docker
* Confluence API credentials (see [CONFLUENCE_SETUP.md](./CONFLUENCE_SETUP.md))

### Run the Platform

1. **Set up Confluence credentials** (required for category theory content):
   - See [CONFLUENCE_SETUP.md](./CONFLUENCE_SETUP.md) for detailed instructions
   - Create a `.env` file in the project root with your Confluence credentials

2. **Start the application:**
   ```bash
   docker compose build 
   docker compose up -d
   ```

**Once the services start, the application will be available at:**
[http://localhost:3000](http://localhost:3000)


---

## Technologies Used

* **Java / Spring Boot**
* **TypeScript / Next.js**
* **Node.js**
* **FH LDAP Authentication**
* **Docker & Docker Compose**

---

## Notice

This project is part of the **FH Technikum Wien** InnoLab program.




