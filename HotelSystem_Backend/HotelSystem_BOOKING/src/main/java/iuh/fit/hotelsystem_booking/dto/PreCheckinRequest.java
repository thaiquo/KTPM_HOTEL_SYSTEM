package iuh.fit.hotelsystem_booking.dto;

import iuh.fit.hotelsystem_booking.entity.IdDocumentType;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class PreCheckinRequest {
    private List<Document> documents = new ArrayList<>();

    public List<Document> getDocuments() { return documents; }
    public void setDocuments(List<Document> documents) { this.documents = documents; }

    public static class Document {
        private Long guestId;
        private IdDocumentType idType;
        private String idNumber;
        private LocalDate issuedDate;
        private String issuedPlace;
        private String idImageUrl;

        public Long getGuestId() { return guestId; }
        public void setGuestId(Long guestId) { this.guestId = guestId; }

        public IdDocumentType getIdType() { return idType; }
        public void setIdType(IdDocumentType idType) { this.idType = idType; }

        public String getIdNumber() { return idNumber; }
        public void setIdNumber(String idNumber) { this.idNumber = idNumber; }

        public LocalDate getIssuedDate() { return issuedDate; }
        public void setIssuedDate(LocalDate issuedDate) { this.issuedDate = issuedDate; }

        public String getIssuedPlace() { return issuedPlace; }
        public void setIssuedPlace(String issuedPlace) { this.issuedPlace = issuedPlace; }

        public String getIdImageUrl() { return idImageUrl; }
        public void setIdImageUrl(String idImageUrl) { this.idImageUrl = idImageUrl; }
    }
}
