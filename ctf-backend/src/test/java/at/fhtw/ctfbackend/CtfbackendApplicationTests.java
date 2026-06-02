package at.fhtw.ctfbackend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "JWT_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
class CtfbackendApplicationTests {

	@Test
	void contextLoads() {
	}

}
