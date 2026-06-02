package at.fhtw.ctfbackend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(properties = "JWT_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
@ActiveProfiles("test")
class CtfbackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
