package at.fhtw.ctfbackend.models;

public class LoginCredentials {
    private String username;
    private String password;
    private boolean isAdmin;

    // Add default constructor
    public LoginCredentials() {
    }

    // Add parameterized constructor if needed
    public LoginCredentials(String username, String password) {
        this.username = username;
        this.password = password;
    }

    // getters and setters
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public boolean isAdmin() { return isAdmin; }
    public void setAdmin(boolean admin) { isAdmin = admin; }
}