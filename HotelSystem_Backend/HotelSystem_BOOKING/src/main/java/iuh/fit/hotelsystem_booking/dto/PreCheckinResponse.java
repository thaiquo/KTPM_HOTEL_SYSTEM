package iuh.fit.hotelsystem_booking.dto;

import iuh.fit.hotelsystem_booking.entity.IdDocumentType;
import iuh.fit.hotelsystem_booking.entity.PreCheckinInfo;

public class PreCheckinResponse {
    private Long id;
    private Long bookingId;
    private Long guestId;
    private IdDocumentType idType;
    private String maskedIdNumber;
    private String idImageUrl;
    private Boolean verified;

    public static PreCheckinResponse from(PreCheckinInfo info) {
        PreCheckinResponse response = new PreCheckinResponse();
        response.id = info.getId();
        response.bookingId = info.getBookingId();
        response.guestId = info.getGuestId();
        response.idType = info.getIdType();
        response.maskedIdNumber = mask(info.getIdNumber());
        response.idImageUrl = info.getIdImageUrl();
        response.verified = info.getVerified();
        return response;
    }

    private static String mask(String value) {
        if (value == null || value.length() <= 6) {
            return "***";
        }
        return value.substring(0, 3) + "*".repeat(Math.max(0, value.length() - 6)) + value.substring(value.length() - 3);
    }

    public Long getId() { return id; }
    public Long getBookingId() { return bookingId; }
    public Long getGuestId() { return guestId; }
    public IdDocumentType getIdType() { return idType; }
    public String getMaskedIdNumber() { return maskedIdNumber; }
    public String getIdImageUrl() { return idImageUrl; }
    public Boolean getVerified() { return verified; }
}
