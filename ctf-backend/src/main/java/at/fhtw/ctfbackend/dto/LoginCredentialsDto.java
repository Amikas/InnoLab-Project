package at.fhtw.ctfbackend.dto;

public class LoginCredentialsDto {
    private String username;
    private String password;
    private boolean isAdmin;

    public LoginCredentialsDto() {
    }

    public LoginCredentialsDto(String username, String password) {
        this.username = username;
        this.password = password;
    }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public boolean isAdmin() { return isAdmin; }
    public void setAdmin(boolean admin) { isAdmin = admin; }
}
