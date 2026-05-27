package iuh.fit.hotelsystem_booking.dto;

import iuh.fit.hotelsystem_booking.entity.BookingItem;

import java.util.ArrayList;
import java.util.List;

public class BookingRoomActionResult {
    private boolean success;
    private List<BookingItem> rooms = new ArrayList<>();
    private List<String> errors = new ArrayList<>();
    private Long invoiceId;
    private String invoiceCode;

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public List<BookingItem> getRooms() { return rooms; }
    public void setRooms(List<BookingItem> rooms) { this.rooms = rooms; }

    public List<String> getErrors() { return errors; }
    public void setErrors(List<String> errors) { this.errors = errors; }

    public Long getInvoiceId() { return invoiceId; }
    public void setInvoiceId(Long invoiceId) { this.invoiceId = invoiceId; }

    public String getInvoiceCode() { return invoiceCode; }
    public void setInvoiceCode(String invoiceCode) { this.invoiceCode = invoiceCode; }
}
