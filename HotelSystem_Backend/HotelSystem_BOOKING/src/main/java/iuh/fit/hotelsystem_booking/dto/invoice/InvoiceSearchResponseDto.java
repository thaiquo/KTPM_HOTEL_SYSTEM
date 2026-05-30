package iuh.fit.hotelsystem_booking.dto.invoice;

import lombok.Data;
import java.util.List;

@Data
public class InvoiceSearchResponseDto {
    private List<InvoiceListDto> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private InvoiceSummaryDto summary;
    private String invoiceStatus;
    private String paymentStatus;
}
