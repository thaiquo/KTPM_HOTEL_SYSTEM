package iuh.fit.hotelsystem_ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import iuh.fit.hotelsystem_ai.dto.ChatAction;
import iuh.fit.hotelsystem_ai.dto.ChatContextMessage;
import iuh.fit.hotelsystem_ai.dto.ChatbotRequest;
import iuh.fit.hotelsystem_ai.dto.ChatbotResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;

import java.text.Normalizer;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ChatbotService {

    private static final Logger log = LoggerFactory.getLogger(ChatbotService.class);
    private static final int MAX_CONTEXT_MESSAGES = 6;
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter VIETNAM_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

    private static final List<FaqRule> FAQ_RULES = List.of(
            new FaqRule(Pattern.compile("gio\\s+(nhan|check.?in)|thoi\\s+gian\\s+(nhan|check.?in)|luc\\s+may\\s+gio\\s+(nhan|check.?in)|quy\\s+dinh\\s+nhan\\s+phong|nhan\\s+phong\\s+luc\\s+may\\s+gio|gio\\s+giac\\s+nhan\\s+phong"),
                    "Giờ nhận phòng tiêu chuẩn là từ 14:00. Nếu muốn nhận sớm, nhân viên sẽ kiểm tra tình trạng phòng khi bạn đến."),
            new FaqRule(Pattern.compile("gio\\s+(tra|check.?out)|thoi\\s+gian\\s+(tra|check.?out)|luc\\s+may\\s+gio\\s+(tra|check.?out)|quy\\s+dinh\\s+tra\\s+phong|tra\\s+phong\\s+luc\\s+may\\s+gio|gio\\s+giac\\s+tra\\s+phong"),
                    "Giờ trả phòng tiêu chuẩn là trước 12:00. Trễ dưới 30 phút được miễn phí, từ 12:00 đến trước 14:00 phụ thu 20% giá 1 đêm, từ 14:00 đến 18:00 phụ thu 50% và sau 18:00 phụ thu 100%."),
                new FaqRule(Pattern.compile("quy\\s+dinh|noi\\s+quy|chinh\\s+sach|policy|regulation"),
                    "Bạn có thể xem trang Quy định khách sạn để đọc đầy đủ chính sách check-in, check-out, hủy phòng và hoàn tiền."),
                new FaqRule(Pattern.compile("huy\\s+phong|huy\\s+dat\\s+phong|huy\\s+booking|huy\\s+book|cancel"),
                    "Ngày thường được hủy miễn phí trước 24 giờ, Lễ/Tết trước 72 giờ. Gói không hoàn tiền thì không được hủy để hoàn tiền."),
                new FaqRule(Pattern.compile("hoan\\s+tien|refund|tra\\s+lai\\s+tien|tien\\s+hoan"),
                    "Hoàn tiền do hủy booking được xử lý theo hàng đợi nội bộ, SLA tiêu chuẩn là 48 giờ. Nếu checkout sớm, refund được tính theo số đêm chưa dùng và có thể hoàn 80% phần đêm dư sau khi trừ tối thiểu 2 đêm."),
            new FaqRule(Pattern.compile("wifi|internet"),
                    "Khách sạn có Wi-Fi miễn phí cho khách lưu trú."),
            new FaqRule(Pattern.compile("ho boi|pool|be boi"),
                    "Khách sạn có hồ bơi ngoài trời. Bạn có thể hỏi thêm lễ tân khi nhận phòng để biết khung giờ hoạt động."),
            new FaqRule(Pattern.compile("breakfast|an sang|buffet"),
                    "Khách sạn có phục vụ bữa sáng theo khung giờ của nhà hàng. Bạn có thể hỏi lễ tân khi check-in để biết chi tiết.")
    );

    private final ObjectMapper objectMapper;
    private final RestClient restClient;
    private final String openRouterApiKey;
    private final String openRouterModel;
    private final double openRouterTemperature;
    private final int openRouterMaxTokens;
    private final String openRouterReferer;
    private final String openRouterTitle;

    public ChatbotService(
            ObjectMapper objectMapper,
            @Value("${openrouter.api-key:}") String openRouterApiKey,
            @Value("${openrouter.model:openai/gpt-4o-mini}") String openRouterModel,
            @Value("${openrouter.temperature:0.3}") double openRouterTemperature,
            @Value("${openrouter.max-output-tokens:150}") int openRouterMaxTokens,
            @Value("${openrouter.http-referer:}") String openRouterReferer,
            @Value("${openrouter.app-name:HotelSystem}") String openRouterTitle
    ) {
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
        this.openRouterApiKey = openRouterApiKey;
        this.openRouterModel = openRouterModel;
        this.openRouterTemperature = openRouterTemperature;
        this.openRouterMaxTokens = openRouterMaxTokens;
        this.openRouterReferer = openRouterReferer;
        this.openRouterTitle = openRouterTitle;
    }

    public ChatbotResponse reply(ChatbotRequest request) {
        String message = request.message() == null ? "" : request.message().trim();
        boolean isAuthenticated = Boolean.TRUE.equals(request.isAuthenticated());

        ChatbotResponse faqReply = matchFaq(message);
        if (faqReply != null) {
            return faqReply;
        }

        ChatbotResponse deterministicReply = buildDeterministicReply(message);
        if (deterministicReply != null) {
            return deterministicReply;
        }

        ChatbotResponse fallback = buildFallbackReply(message, isAuthenticated);
        if (openRouterApiKey == null || openRouterApiKey.isBlank()) {
            return fallback;
        }

        try {
            ChatbotResponse openRouterReply = callOpenRouter(request, message, isAuthenticated);
            if (openRouterReply != null && openRouterReply.message() != null && !openRouterReply.message().isBlank()) {
                return normalizeResponse(openRouterReply, "openrouter", fallback);
            }
            log.warn("OpenRouter returned an empty response; using local fallback");
        } catch (HttpStatusCodeException exception) {
            log.warn("OpenRouter request failed with status {}: {}", exception.getStatusCode(), exception.getResponseBodyAsString());
        } catch (Exception exception) {
            log.warn("OpenRouter chatbot request failed, falling back to local reply: {}", exception.getMessage());
        }

        return fallback;
    }

    private ChatbotResponse matchFaq(String message) {
        String normalized = normalize(message);
        for (FaqRule rule : FAQ_RULES) {
            if (rule.pattern().matcher(normalized).find()) {
                return new ChatbotResponse(rule.message(), null, "FAQ", "local");
            }
        }
        return null;
    }

    private ChatbotResponse buildFallbackReply(String message, boolean isAuthenticated) {
        String normalized = normalize(message);

        if (normalized.matches(".*(hom nay la thu may|thu may|hom nay la ngay may|ngay may|hom nay la ngay nao|hom nay la thu nao).*")) {
            LocalDate today = LocalDate.now(VIETNAM_ZONE);
            return new ChatbotResponse(
                    "Hôm nay là thứ " + vietnameseDayOfWeek(today.getDayOfWeek()) + ", ngày " + today.format(VIETNAM_DATE),
                    null,
                    "FAQ",
                    "local"
            );
        }

        if (normalized.matches(".*(ngay le|le tet|tet|holiday).*(gia|tien|bao nhieu|phu thu)|(gia|tien|bao nhieu|phu thu).*(ngay le|le tet|tet|holiday).*")) {
            return new ChatbotResponse(
                    "Dịp lễ/Tết, giá phòng thường được tính theo hệ số 1.3x so với ngày thường. Nếu bạn gửi tên phòng và ngày check-in cụ thể, mình sẽ tính sát hơn.",
                    new ChatAction("Xem phòng", "/rooms"),
                    "SEARCH_ROOM",
                    "local"
            );
        }

        if (normalized.matches(".*(thanh toan|payment|chua tra|chua thanh toan|hoa don).*")) {
            return new ChatbotResponse(
                    isAuthenticated
                            ? "Mình sẽ đưa bạn đến trang đặt phòng để kiểm tra trạng thái thanh toán và hóa đơn."
                            : "Bạn cần đăng nhập trước để xem trạng thái thanh toán của các đặt phòng.",
                    new ChatAction(isAuthenticated ? "Xem thanh toán" : "Đăng nhập", isAuthenticated ? "/my-bookings" : "/login"),
                    isAuthenticated ? "VIEW_PAYMENTS" : "LOGIN_REQUIRED",
                    "local"
            );
        }

        if (normalized.matches(".*(booking|dat phong cua toi|lich su|sap checkin|sap nhan phong).*")) {
            return new ChatbotResponse(
                    isAuthenticated
                            ? "Mình sẽ mở danh sách đặt phòng để bạn theo dõi lịch trình, trạng thái và chi tiết hoàn tiền nếu có."
                            : "Bạn cần đăng nhập để xem danh sách đặt phòng cá nhân.",
                    new ChatAction(isAuthenticated ? "Xem đặt phòng" : "Đăng nhập", isAuthenticated ? "/my-bookings" : "/login"),
                    isAuthenticated ? "VIEW_BOOKINGS" : "LOGIN_REQUIRED",
                    "local"
            );
        }

        if (normalized.matches(".*(thong bao|notification|hoan tien|refund).*")) {
            return new ChatbotResponse(
                    isAuthenticated
                            ? "Thông báo mới nhất đang nằm trong menu tài khoản và trang hồ sơ. Mình mở trang hồ sơ cho bạn nhé."
                            : "Bạn cần đăng nhập để xem thông báo và trạng thái hoàn tiền.",
                    new ChatAction(isAuthenticated ? "Xem hồ sơ" : "Đăng nhập", isAuthenticated ? "/profile" : "/login"),
                    isAuthenticated ? "VIEW_NOTIFICATIONS" : "LOGIN_REQUIRED",
                    "local"
            );
        }

        if (normalized.matches(".*(tim phong|dat phong|book phong|phong trong|con phong|phong doi|phong don|phong suite|phong deluxe|phong standard|phong gia dinh|phong vip).*$")) {
            return new ChatbotResponse(
                    "Mình đã hiểu là bạn muốn tìm phòng. Mình sẽ mở trang phòng với các thông tin có thể suy ra từ câu chat.",
                    new ChatAction("Tìm phòng", buildRoomSearchUrl(message)),
                    "SEARCH_ROOM",
                    "local"
            );
        }

        return new ChatbotResponse(
                "Mình có thể hỗ trợ nhanh các việc như tìm phòng, xem đặt phòng, kiểm tra thanh toán, thông báo, giờ check-in/check-out, Wi-Fi và hồ bơi.",
                null,
                "GENERAL",
                "local"
        );
    }

    private ChatbotResponse buildDeterministicReply(String message) {
        String normalized = normalize(message);

        if (normalized.matches(".*(hom nay la thu may|thu may|hom nay la ngay may|ngay may|hom nay la ngay nao|hom nay la thu nao).*")) {
            LocalDate today = LocalDate.now(VIETNAM_ZONE);
            return new ChatbotResponse(
                    "Hôm nay là thứ " + vietnameseDayOfWeek(today.getDayOfWeek()) + ", ngày " + today.format(VIETNAM_DATE),
                    null,
                    "FAQ",
                    "local"
            );
        }

        if (normalized.matches(".*(ngay le|le tet|tet|holiday).*(gia|tien|bao nhieu|phu thu)|(gia|tien|bao nhieu|phu thu).*(ngay le|le tet|tet|holiday).*")) {
            return new ChatbotResponse(
                    "Dịp lễ/Tết, giá phòng thường được tính theo hệ số 1.3x so với ngày thường. Nếu bạn gửi tên phòng và ngày check-in cụ thể, mình sẽ tính sát hơn.",
                    new ChatAction("Xem phòng", "/rooms"),
                    "SEARCH_ROOM",
                    "local"
            );
        }

        return null;
    }

    private ChatbotResponse callOpenRouter(ChatbotRequest request, String message, boolean isAuthenticated) throws Exception {
        String systemPrompt = buildSystemPrompt();
        String userPrompt = buildUserPrompt(request, message, isAuthenticated);
        Map<String, Object> payload = Map.of(
                "model", openRouterModel,
                "messages", List.of(
                        Map.of(
                                "role", "system",
                                "content", systemPrompt
                        ),
                        Map.of(
                                "role", "user",
                                "content", userPrompt
                        )
                ),
                "temperature", openRouterTemperature,
                "max_tokens", openRouterMaxTokens,
                "response_format", Map.of("type", "json_object")
        );

        var openRouterRequest = restClient.post()
                .uri(OPENROUTER_ENDPOINT)
                .header("Authorization", "Bearer %s".formatted(openRouterApiKey));

        if (openRouterReferer != null && !openRouterReferer.isBlank()) {
            openRouterRequest = openRouterRequest.header("HTTP-Referer", openRouterReferer);
        }

        if (openRouterTitle != null && !openRouterTitle.isBlank()) {
            openRouterRequest = openRouterRequest.header("X-Title", openRouterTitle);
        }

        String responseBody = openRouterRequest
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(String.class);

        if (responseBody == null || responseBody.isBlank()) {
            return null;
        }

        JsonNode root = objectMapper.readTree(responseBody);
        String text = root.path("choices")
                .path(0)
                .path("message")
                .path("content")
                .asText("");

        if (text.isBlank()) {
            text = root.path("choices")
                    .path(0)
                    .path("message")
                    .path("text")
                .asText("");
        }

        if (text.isBlank()) {
            return null;
        }

        String cleaned = stripCodeFence(text);
        try {
            return objectMapper.readValue(cleaned, ChatbotResponse.class);
        } catch (Exception parseException) {
            log.warn("OpenRouter returned non-JSON content, using raw text fallback: {}", parseException.getMessage());
            String rawText = cleaned.trim();
            if (rawText.isBlank()) {
                return null;
            }
            return new ChatbotResponse(rawText, null, "OTHER", "openrouter");
        }
    }

    private ChatbotResponse normalizeResponse(ChatbotResponse response, String source, ChatbotResponse fallback) {
        String message = response.message() == null || response.message().isBlank() ? fallback.message() : response.message().trim();
        ChatAction action = response.action();
        if (action != null) {
            String label = action.label() == null ? "" : action.label().trim();
            String to = action.to() == null ? "" : action.to().trim();
            if (label.isBlank() || to.isBlank()) {
                action = null;
            } else {
                action = new ChatAction(label, to);
            }
        }

        String intent = response.intent() == null || response.intent().isBlank() ? fallback.intent() : response.intent().trim();
        return new ChatbotResponse(message, action, intent, source);
    }

    private String buildSystemPrompt() {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        String todayText = "Hôm nay theo giờ Việt Nam là thứ " + vietnameseDayOfWeek(today.getDayOfWeek()) + ", ngày " + today.format(VIETNAM_DATE) + ".";

        return "Bạn là AI chatbot điều hướng cho hệ thống khách sạn.\n"
                + "Nhiệm vụ: trả về JSON hợp lệ, ngắn gọn, chỉ dùng tiếng Việt tự nhiên có dấu.\n"
                + "Không dùng tiếng Anh trừ khi tên riêng hoặc mã định danh bắt buộc.\n"
                + "Không markdown. Không giải thích ngoài JSON.\n"
                + "Không bịa số liệu về booking, phòng, thanh toán, hoàn tiền hoặc ngày hiện tại. Nếu thiếu dữ liệu khách sạn thì nói ngắn gọn là không đủ dữ liệu và gợi ý trang phù hợp.\n"
                + "Nếu câu hỏi là kiến thức tổng quát ngoài khách sạn, hãy trả lời trực tiếp, rõ ràng, hữu ích và không từ chối vô cớ.\n"
                + todayText + "\n"
                + "Schema bắt buộc:\n"
                + "{\n"
                + "  \"message\": \"string\",\n"
                + "  \"intent\": \"FAQ|VIEW_BOOKINGS|VIEW_UPCOMING_BOOKINGS|VIEW_PAYMENTS|VIEW_NOTIFICATIONS|SEARCH_ROOM|BOOK_NOW|OTHER\",\n"
                + "  \"action\": { \"label\": \"string\", \"to\": \"/rooms\" }\n"
                + "}\n"
                + "Nếu không cần điều hướng, action có thể là null.\n"
                + "Các route hợp lệ: /rooms, /my-bookings, /profile, /login.";
    }

    private String vietnameseDayOfWeek(DayOfWeek dayOfWeek) {
        return switch (dayOfWeek) {
            case MONDAY -> "Hai";
            case TUESDAY -> "Ba";
            case WEDNESDAY -> "Tư";
            case THURSDAY -> "Năm";
            case FRIDAY -> "Sáu";
            case SATURDAY -> "Bảy";
            case SUNDAY -> "Chủ nhật";
        };
    }

    private boolean isGeneralKnowledgeQuestion(String normalized) {
        return normalized.matches(".*(bao nhieu|la gi|tai sao|the nao|ai la|o dau|how many|what is|who is|when is|where is|why is|explain).*")
                && !normalized.matches(".*(phong|booking|dat phong|check.?in|check.?out|thanh toan|hoa don|hoan tien|refund|wifi|ho boi|gia phong|khach san|hotel).*");
    }

    private String buildUserPrompt(ChatbotRequest request, String message, boolean isAuthenticated) {
        StringBuilder builder = new StringBuilder();
        builder.append("Trạng thái đăng nhập của người dùng: ").append(isAuthenticated ? "Đã đăng nhập" : "Chưa đăng nhập").append(".\n");
        builder.append("Tin nhắn hiện tại: ").append(message).append("\n");
        builder.append("Loại câu hỏi: ").append(isGeneralKnowledgeQuestion(normalize(message)) ? "Kiến thức tổng quát" : "Liên quan hệ thống khách sạn").append(".\n");

        List<ChatContextMessage> context = request.context() == null ? List.of() : request.context();
        List<ChatContextMessage> recentContext = context.size() <= MAX_CONTEXT_MESSAGES
                ? context
                : context.subList(context.size() - MAX_CONTEXT_MESSAGES, context.size());

        if (!recentContext.isEmpty()) {
            builder.append("Ngữ cảnh gần nhất:\n");
            for (ChatContextMessage contextMessage : recentContext) {
                builder.append("- ")
                        .append(contextMessage.role())
                        .append(": ")
                        .append(contextMessage.text())
                        .append("\n");
            }
        }

        return builder.toString();
    }

    private String buildRoomSearchUrl(String message) {
        String normalized = normalize(message);
        Matcher guestMatcher = Pattern.compile("(\\d+)\\s*(khach|nguoi|adult|guest)").matcher(normalized);
        Integer guests = guestMatcher.find() ? Integer.parseInt(guestMatcher.group(1)) : null;
        List<String> params = new ArrayList<>();

        if (guests != null && guests > 0) {
            params.add("guests=" + guests);
            params.add("rooms=" + (guests > 4 ? 2 : 1));
        }

        if (normalized.contains("cuoi tuan")) {
            LocalDate saturday = nextSaturday();
            params.add("checkIn=" + ISO_DATE.format(saturday));
            params.add("checkOut=" + ISO_DATE.format(saturday.plusDays(1)));
        }

        if (params.isEmpty()) {
            return "/rooms";
        }

        return "/rooms?" + String.join("&", params);
    }

    private static LocalDate nextSaturday() {
        LocalDate today = LocalDate.now();
        int daysUntilSaturday = (DayOfWeek.SATURDAY.getValue() - today.getDayOfWeek().getValue() + 7) % 7;
        if (daysUntilSaturday == 0) {
            daysUntilSaturday = 7;
        }
        return today.plusDays(daysUntilSaturday);
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        String lowerCase = value.toLowerCase(Locale.ROOT);
        String decomposed = Normalizer.normalize(lowerCase, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return decomposed.replace('đ', 'd');
    }

    private static String stripCodeFence(String value) {
        String cleaned = value.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceFirst("^```(?:json)?\\s*", "");
            cleaned = cleaned.replaceFirst("\\s*```$", "");
        }
        return cleaned.trim();
    }

    private record FaqRule(Pattern pattern, String message) {
    }
}
