package iuh.fit.hotelsystem_room.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomImageDto implements Serializable {
    private Long id;
    private String imageUrl;

    @JsonProperty("isThumbnail")
    private Boolean isThumbnail;
}
