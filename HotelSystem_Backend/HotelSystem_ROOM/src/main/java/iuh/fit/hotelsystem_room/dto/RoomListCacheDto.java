package iuh.fit.hotelsystem_room.dto;

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
public class RoomListCacheDto implements Serializable {
    @Builder.Default
    private List<RoomResponseDto> rooms = new ArrayList<>();
}
