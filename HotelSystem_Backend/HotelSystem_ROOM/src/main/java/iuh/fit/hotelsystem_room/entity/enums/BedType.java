package iuh.fit.hotelsystem_room.entity.enums;

public enum BedType {
    SINGLE("Giường đơn"),
    DOUBLE("Giường đôi"),
    QUEEN("Queen"),
    KING("King"),
    EXTRA("Giường phụ"),
    SOFA("Sofa bed"),
    BUNK("Giường tầng");

    private final String displayName;

    BedType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
