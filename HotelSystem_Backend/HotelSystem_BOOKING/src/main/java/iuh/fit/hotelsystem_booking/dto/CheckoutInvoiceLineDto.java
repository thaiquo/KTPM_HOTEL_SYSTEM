package iuh.fit.hotelsystem_booking.dto;

import java.math.BigDecimal;

public class CheckoutInvoiceLineDto {
    private Long bookingRoomId;
    private Long roomId;
    private String roomNumber;
    private String roomTypeName;
    private String itemType;
    private String category;
    private String description;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal amount;

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Long getBookingRoomId() { return bookingRoomId; }
    public void setBookingRoomId(Long bookingRoomId) { this.bookingRoomId = bookingRoomId; }

    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }

    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

    public String getRoomTypeName() { return roomTypeName; }
    public void setRoomTypeName(String roomTypeName) { this.roomTypeName = roomTypeName; }

    public String getItemType() { return itemType; }
    public void setItemType(String itemType) { this.itemType = itemType; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}