package iuh.fit.hotelsystem_payment.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentStatusResponse {
    private Long bookingId;
    private String status;
    private Double totalAmount;
    private Double paidAmount;
}
