package iuh.fit.hotelsystem_payment.entity;

/**
 * Refund processing channel. VNPAY refunds reference the original gateway txn without card data.
 */
public enum RefundTransactionMethod {
    ORIGINAL_PAYMENT,
    VNPAY_REFUND,
    CASH,
    BANK_TRANSFER
}
