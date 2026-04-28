package iuh.fit.hotelsystem_booking.service;

import iuh.fit.hotelsystem_booking.dto.PreCheckinRequest;
import iuh.fit.hotelsystem_booking.dto.PreCheckinResponse;
import iuh.fit.hotelsystem_booking.entity.Booking;
import iuh.fit.hotelsystem_booking.entity.BookingGuest;
import iuh.fit.hotelsystem_booking.entity.PreCheckinInfo;
import iuh.fit.hotelsystem_booking.repository.BookingGuestRepository;
import iuh.fit.hotelsystem_booking.repository.BookingRepository;
import iuh.fit.hotelsystem_booking.repository.PreCheckinInfoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PreCheckinService {

    private final BookingRepository bookingRepository;
    private final BookingGuestRepository guestRepository;
    private final PreCheckinInfoRepository preCheckinRepository;

    public PreCheckinService(BookingRepository bookingRepository,
                             BookingGuestRepository guestRepository,
                             PreCheckinInfoRepository preCheckinRepository) {
        this.bookingRepository = bookingRepository;
        this.guestRepository = guestRepository;
        this.preCheckinRepository = preCheckinRepository;
    }

    @Transactional
    public List<PreCheckinResponse> submit(Long bookingId, PreCheckinRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));
        if (request == null || request.getDocuments() == null || request.getDocuments().isEmpty()) {
            throw new IllegalArgumentException("Vui lòng nhập đúng thông tin giấy tờ. Khách sạn sẽ kiểm tra giấy tờ gốc khi nhận phòng.");
        }

        for (PreCheckinRequest.Document document : request.getDocuments()) {
            BookingGuest guest = guestRepository.findByIdAndBookingId(document.getGuestId(), bookingId)
                    .orElseThrow(() -> new IllegalArgumentException("Guest not found in booking"));
            if (document.getIdType() == null || isBlank(document.getIdNumber())) {
                throw new IllegalArgumentException("Vui lòng nhập đúng thông tin giấy tờ. Khách sạn sẽ kiểm tra giấy tờ gốc khi nhận phòng.");
            }

            PreCheckinInfo info = preCheckinRepository.findByBookingIdAndGuestId(bookingId, guest.getId())
                    .orElseGet(PreCheckinInfo::new);
            info.setBookingId(bookingId);
            info.setGuestId(guest.getId());
            info.setIdType(document.getIdType());
            info.setIdNumber(document.getIdNumber().trim());
            info.setIssuedDate(document.getIssuedDate());
            info.setIssuedPlace(document.getIssuedPlace());
            info.setIdImageUrl(document.getIdImageUrl());
            info.setVerified(false);
            if (info.getCreatedAt() == null) {
                info.setCreatedAt(LocalDateTime.now());
            }
            info.setUpdatedAt(LocalDateTime.now());
            preCheckinRepository.save(info);
        }

        booking.setPreCheckinCompleted(true);
        bookingRepository.save(booking);
        return preCheckinRepository.findByBookingId(bookingId).stream()
                .map(PreCheckinResponse::from)
                .toList();
    }

    @Transactional
    public List<PreCheckinResponse> verify(Long bookingId, Long staffId) {
        List<PreCheckinInfo> infos = preCheckinRepository.findByBookingId(bookingId);
        if (infos.isEmpty()) {
            throw new IllegalStateException("No pre-check-in information submitted");
        }
        for (PreCheckinInfo info : infos) {
            info.setVerified(true);
            info.setVerifiedBy(staffId);
            info.setVerifiedAt(LocalDateTime.now());
            info.setUpdatedAt(LocalDateTime.now());
            preCheckinRepository.save(info);
        }
        return infos.stream().map(PreCheckinResponse::from).toList();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
