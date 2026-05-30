package iuh.fit.hotelsystem_booking.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.transaction.UnexpectedRollbackException;
import org.springframework.transaction.TransactionSystemException;
import java.util.NoSuchElementException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, Object>> handleSecurity(SecurityException ex, HttpServletRequest request) {
        return build(HttpStatus.UNAUTHORIZED, ex, request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex, HttpServletRequest request) {
        return build(HttpStatus.BAD_REQUEST, ex, request);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleConflict(IllegalStateException ex, HttpServletRequest request) {
        return build(HttpStatus.CONFLICT, ex, request);
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NoSuchElementException ex, HttpServletRequest request) {
        return build(HttpStatus.NOT_FOUND, ex, request);
    }

    @ExceptionHandler({DataIntegrityViolationException.class, TransactionSystemException.class, UnexpectedRollbackException.class})
    public ResponseEntity<Map<String, Object>> handlePersistence(Exception ex, HttpServletRequest request) {
        Throwable root = rootCause(ex);
        log.error("Persistence exception. path={}, rootType={}, rootMessage={}",
                request != null ? request.getRequestURI() : null,
                root != null ? root.getClass().getName() : null,
                root != null ? root.getMessage() : null,
                ex);
        return build(HttpStatus.CONFLICT, ex, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception. path={}", request != null ? request.getRequestURI() : null, ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, ex, request);
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, Exception ex, HttpServletRequest request) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", resolveMessage(ex));
        body.put("path", request != null ? request.getRequestURI() : null);
        return ResponseEntity.status(status).body(body);
    }

    private String resolveMessage(Throwable ex) {
        if (ex == null) {
            return "Unexpected error";
        }
        if (ex instanceof UnexpectedRollbackException) {
            Throwable root = rootCause(ex);
            if (root != null && root.getMessage() != null && !root.getMessage().isBlank()) {
                return root.getClass().getSimpleName() + ": " + root.getMessage();
            }
            return "Transaction failed and was rolled back. Please check server logs for root cause.";
        }
        Throwable current = ex;
        Throwable lastMeaningful = ex;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
            if (current.getMessage() != null && !current.getMessage().isBlank()) {
                lastMeaningful = current;
            }
        }
        String message = lastMeaningful.getMessage();
        if (message == null || message.isBlank()) {
            message = ex.getClass().getSimpleName();
        }
        return message;
    }

    private Throwable rootCause(Throwable ex) {
        Throwable current = ex;
        while (current != null && current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        return current;
    }
}
