package at.fhtw.ctfbackend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SubmitFlagRequestDto {
    private String challengeId;
    private String flag;
}
