package iuh.fit.hotelsystem_room.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

/**
 * Redis cache configuration for Room Service.
 *
 * Cache names and TTLs:
 *   - rooms:all       → 30 min  (full room list, updated only on room CRUD)
 *   - rooms:detail    → 60 min  (single room detail, rarely changes)
 *   - rooms:available → 10 min  (available rooms list, changes on booking events)
 */
@Configuration
public class RedisCacheConfig {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        // ── Jackson serializer with type info for polymorphic deserialization ────
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        objectMapper.activateDefaultTyping(
                objectMapper.getPolymorphicTypeValidator(),
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY
        );
        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(objectMapper);

        // ── Default cache configuration: 30-minute TTL ───────────────────────────
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30))
                .disableCachingNullValues()
                .serializeKeysWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(serializer));

        // ── Per-cache TTL overrides ───────────────────────────────────────────────
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        cacheConfigs.put("rooms:all",
                defaultConfig.entryTtl(Duration.ofMinutes(30)));
        cacheConfigs.put("rooms:all:v2",
                defaultConfig.entryTtl(Duration.ofMinutes(30)));

        cacheConfigs.put("rooms:detail",
                defaultConfig.entryTtl(Duration.ofMinutes(60)));
        cacheConfigs.put("rooms:detail:v2",
                defaultConfig.entryTtl(Duration.ofMinutes(60)));

        cacheConfigs.put("rooms:available",
                defaultConfig.entryTtl(Duration.ofMinutes(10)));
        cacheConfigs.put("rooms:available:v2",
                defaultConfig.entryTtl(Duration.ofMinutes(10)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .transactionAware()
                .build();
    }
}
