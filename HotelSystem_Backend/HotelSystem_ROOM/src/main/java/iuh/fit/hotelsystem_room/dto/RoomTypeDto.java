package iuh.fit.hotelsystem_room.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomTypeDto implements Serializable {
    private Long id;
    private String type;
    private Double basePrice;
    private Integer maxCapacity;
    private Integer defaultCapacity;
    private String description;

    @Builder.Default
    private List<RoomImageDto> images = new ArrayList<>();

    @Builder.Default
    private List<BedConfigDto> bedConfigs = new ArrayList<>();

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BedConfigDto implements Serializable {
        private Long id;
        private BedTypeDto bedType;
        private Integer quantity;

        @JsonProperty("isPrimary")
        private Boolean isPrimary;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BedTypeDto implements Serializable {
        private Long id;
        private String code;
        private String name;
        private Integer maxOccupantsPerBed;
    }
}
