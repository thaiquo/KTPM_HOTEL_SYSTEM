package iuh.fit.hotelsystem_room.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching
public class RedisCacheConfig {

    @Value("${spring.data.redis.host:redis}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration(redisHost, redisPort);
        return new LettuceConnectionFactory(config);
    }

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        GenericJackson2JsonRedisSerializer jsonSerializer = new GenericJackson2JsonRedisSerializer();

        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(jsonSerializer))
                .disableCachingNullValues();

        // Tuỳ chỉnh TTL per cache name
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        // rooms:all — cache danh sách tất cả phòng, TTL 5 phút
        cacheConfigs.put("rooms:all", defaultConfig.entryTtl(Duration.ofMinutes(5)));
        cacheConfigs.put("rooms:all:v2", defaultConfig.entryTtl(Duration.ofMinutes(5)));

        // rooms:available — cache phòng trống theo ngày, TTL 2 phút
        // (ngắn hơn vì trạng thái thay đổi nhanh)
        cacheConfigs.put("rooms:available", defaultConfig.entryTtl(Duration.ofMinutes(2)));
        cacheConfigs.put("rooms:available:v2", defaultConfig.entryTtl(Duration.ofMinutes(2)));

        // rooms:detail — cache chi tiết phòng, TTL 10 phút
        cacheConfigs.put("rooms:detail", defaultConfig.entryTtl(Duration.ofMinutes(10)));
        cacheConfigs.put("rooms:detail:v2", defaultConfig.entryTtl(Duration.ofMinutes(10)));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }
}
