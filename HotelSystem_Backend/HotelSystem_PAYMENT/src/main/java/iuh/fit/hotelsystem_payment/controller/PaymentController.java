//package iuh.fit.hotelsystem_payment.controller;
//
//import iuh.fit.hotelsystem_payment.entity.Payment;
//import iuh.fit.hotelsystem_payment.service.PaymentService;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.List;
//
//@RestController
//@RequestMapping("/payments")
//public class PaymentController {
//
//    @Autowired
//    private PaymentService paymentService;
//
//    /**
//     * Thanh toán cho booking
//     */
//    @PostMapping
//    public Payment processPayment(@RequestBody Payment payment) {
//        return paymentService.processPayment(payment);
//    }
//
//    /**
//     * Lấy tất cả payment
//     */
//    @GetMapping
//    public List<Payment> getAllPayments() {
//        return paymentService.getAllPayments();
//    }
//
//    /**
//     * Lấy payment theo id
//     */
//    @GetMapping("/{id}")
//    public Payment getPaymentById(@PathVariable Long id) {
//        return paymentService.getPaymentById(id);
//    }
//
//    /**
//     * Lấy payment theo bookingId
//     */
//    @GetMapping("/booking/{bookingId}")
//    public List<Payment> getByBookingId(@PathVariable Long bookingId) {
//        return paymentService.getPaymentsByBookingId(bookingId);
//    }
//}
