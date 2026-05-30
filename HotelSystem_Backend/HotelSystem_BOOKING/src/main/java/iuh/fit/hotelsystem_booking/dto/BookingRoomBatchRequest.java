package iuh.fit.hotelsystem_booking.dto;

import java.util.ArrayList;
import java.util.List;
import java.math.BigDecimal;

public class BookingRoomBatchRequest {
    private List<Long> bookingRoomIds = new ArrayList<>();
    private Long staffId;
    private List<BookingRoomCheckInRequest> checkIns = new ArrayList<>();
    private List<BookingRoomExtraFeeRequest> extraFees = new ArrayList<>();
    private List<ServiceLineDto> serviceLines = new ArrayList<>();
    private String paymentMethod;
    private BigDecimal receivedAmount;
    private BigDecimal changeAmount;

    public List<Long> getBookingRoomIds() { return bookingRoomIds; }
    public void setBookingRoomIds(List<Long> bookingRoomIds) { this.bookingRoomIds = bookingRoomIds; }

    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }

    public List<BookingRoomCheckInRequest> getCheckIns() { return checkIns; }
    public void setCheckIns(List<BookingRoomCheckInRequest> checkIns) { this.checkIns = checkIns; }

    public List<BookingRoomExtraFeeRequest> getExtraFees() { return extraFees; }
    public void setExtraFees(List<BookingRoomExtraFeeRequest> extraFees) { this.extraFees = extraFees; }

    public List<ServiceLineDto> getServiceLines() { return serviceLines; }
    public void setServiceLines(List<ServiceLineDto> serviceLines) { this.serviceLines = serviceLines; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public BigDecimal getReceivedAmount() { return receivedAmount; }
    public void setReceivedAmount(BigDecimal receivedAmount) { this.receivedAmount = receivedAmount; }

    public BigDecimal getChangeAmount() { return changeAmount; }
    public void setChangeAmount(BigDecimal changeAmount) { this.changeAmount = changeAmount; }
}
