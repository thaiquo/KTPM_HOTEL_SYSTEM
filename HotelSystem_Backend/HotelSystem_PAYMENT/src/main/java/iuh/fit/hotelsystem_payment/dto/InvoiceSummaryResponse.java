package iuh.fit.hotelsystem_payment.dto;

public class InvoiceSummaryResponse {
    private Double monthlyRevenue;
    private Double paidTotal;
    private Double pendingTotal;
    private Long paidCount;
    private Long pendingCount;

    public Double getMonthlyRevenue() { return monthlyRevenue; }
    public void setMonthlyRevenue(Double monthlyRevenue) { this.monthlyRevenue = monthlyRevenue; }

    public Double getPaidTotal() { return paidTotal; }
    public void setPaidTotal(Double paidTotal) { this.paidTotal = paidTotal; }

    public Double getPendingTotal() { return pendingTotal; }
    public void setPendingTotal(Double pendingTotal) { this.pendingTotal = pendingTotal; }

    public Long getPaidCount() { return paidCount; }
    public void setPaidCount(Long paidCount) { this.paidCount = paidCount; }

    public Long getPendingCount() { return pendingCount; }
    public void setPendingCount(Long pendingCount) { this.pendingCount = pendingCount; }
}
