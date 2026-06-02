<?php
/**
 * SYSTEM OCEN WPISÓW - WORDPRESS + WPGRAPHQL
 *
 * Dodaj ten kod do functions.php motywu lub jako osobny plugin
 */

function talem_register_post_rating_graphql() {

    // 1. REJESTRACJA TYPU OBIEKTU DLA ZAPYTANIA (Pobieranie ocen)
    register_graphql_object_type( 'PostRating', [
        'description' => 'Dane o ocenach wpisu',
        'fields' => [
            'average' => [ 'type' => 'Float' ],
            'count'   => [ 'type' => 'Int' ],
        ]
    ]);

    register_graphql_field( 'Post', 'rating', [
        'type' => 'PostRating',
        'description' => 'Ocena tego wpisu',
        'resolve' => function( $post ) {
            $average = get_post_meta( $post->databaseId, 'talem_average_rating', true );
            $count   = get_post_meta( $post->databaseId, 'talem_rating_count', true );

            return [
                'average' => $average ? (float) $average : 0,
                'count'   => $count ? (int) $count : 0,
            ];
        }
    ]);

    // 2. REJESTRACJA MUTACJI (Zapisywanie nowych ocen)
    register_graphql_mutation( 'submitPostRating', [
        'inputFields' => [
            'postId' => [
                'type' => [ 'non_null' => 'Int' ],
                'description' => 'ID wpisu z bazy danych (databaseId)',
            ],
            'rating' => [
                'type' => [ 'non_null' => 'Int' ],
                'description' => 'Ocena od 1 do 5',
            ],
        ],
        'outputFields' => [
            'averageRating' => [ 'type' => 'Float' ],
            'ratingCount'   => [ 'type' => 'Int' ],
            'success'       => [ 'type' => 'Boolean' ],
            'message'       => [ 'type' => 'String' ],
        ],
        'mutateAndGetPayload' => function( $input, $context, $info ) {
            $post_id = (int) $input['postId'];
            $new_rating = (int) $input['rating'];

            // 1. WALIDACJA PODSTAWOWA
            if ( ! get_post( $post_id ) ) {
                throw new \GraphQL\Error\UserError( 'Nie znaleziono wpisu.' );
            }
            if ( $new_rating < 1 || $new_rating > 5 ) {
                throw new \GraphQL\Error\UserError( 'Ocena musi być w przedziale 1-5.' );
            }

            // 2. OCHRONA PRZED SPAMEM (Rate Limiting przez IP)
            $user_ip = talem_get_client_ip();
            $rate_limit_key = 'rating_limit_' . md5( $user_ip . $post_id );
            $last_vote_time = get_transient( $rate_limit_key );

            if ( $last_vote_time ) {
                throw new \GraphQL\Error\UserError( 'Możesz głosować tylko raz na 24 godziny.' );
            }

            // 3. POBIERZ DOTYCHCZASOWE DANE
            $count = (int) get_post_meta( $post_id, 'talem_rating_count', true );
            $sum   = (float) get_post_meta( $post_id, 'talem_rating_sum', true );

            // 4. WYLICZ NOWĄ ŚREDNIĄ
            $count++;
            $sum += $new_rating;
            $average = round( $sum / $count, 2 );

            // 5. ZAPISZ DO BAZY
            update_post_meta( $post_id, 'talem_rating_count', $count );
            update_post_meta( $post_id, 'talem_rating_sum', $sum );
            update_post_meta( $post_id, 'talem_average_rating', $average );

            // 6. USTAW BLOKADĘ NA 24H (Rate Limiting)
            set_transient( $rate_limit_key, time(), DAY_IN_SECONDS );

            // 7. OPCJONALNIE: Zapisz szczegółowy log głosów (do analizy)
            talem_log_rating_vote( $post_id, $new_rating, $user_ip );

            // 8. ZWRÓĆ DANE
            return [
                'averageRating' => $average,
                'ratingCount'   => $count,
                'success'       => true,
                'message'       => 'Dziękujemy za ocenę!',
            ];
        }
    ]);
}

// ⚠️ KLUCZOWA LINIA - BEZ TEGO NIC NIE ZADZIAŁA!
add_action( 'graphql_register_types', 'talem_register_post_rating_graphql' );


/**
 * POMOCNICZA FUNKCJA: Pobierz prawdziwe IP użytkownika
 * (uwzględnia proxy i CloudFlare)
 */
function talem_get_client_ip() {
    $ip_keys = [
        'HTTP_CF_CONNECTING_IP', // CloudFlare
        'HTTP_X_FORWARDED_FOR',  // Proxy
        'HTTP_X_REAL_IP',
        'REMOTE_ADDR'
    ];

    foreach ( $ip_keys as $key ) {
        if ( isset( $_SERVER[ $key ] ) && filter_var( $_SERVER[ $key ], FILTER_VALIDATE_IP ) ) {
            return $_SERVER[ $key ];
        }
    }

    return '0.0.0.0';
}


/**
 * OPCJONALNA FUNKCJA: Szczegółowy log głosów (do analizy/debugowania)
 * Zapisuje wszystkie głosy w osobnej tabeli post_meta jako JSON
 */
function talem_log_rating_vote( $post_id, $rating, $ip ) {
    $votes = get_post_meta( $post_id, 'talem_rating_votes_log', true );

    if ( ! $votes ) {
        $votes = [];
    }

    $votes[] = [
        'rating'    => $rating,
        'ip'        => $ip,
        'timestamp' => current_time( 'timestamp' ),
        'date'      => current_time( 'Y-m-d H:i:s' ),
    ];

    // Zachowaj tylko ostatnie 1000 głosów (oszczędność miejsca)
    if ( count( $votes ) > 1000 ) {
        $votes = array_slice( $votes, -1000 );
    }

    update_post_meta( $post_id, 'talem_rating_votes_log', $votes );
}


/**
 * OPCJONALNA FUNKCJA: Wyświetl oceny w kolumnie WP-Admin
 */
add_filter( 'manage_post_posts_columns', function( $columns ) {
    $columns['rating'] = '⭐ Ocena';
    return $columns;
});

add_action( 'manage_post_posts_custom_column', function( $column, $post_id ) {
    if ( $column === 'rating' ) {
        $average = get_post_meta( $post_id, 'talem_average_rating', true );
        $count   = get_post_meta( $post_id, 'talem_rating_count', true );

        if ( $count ) {
            echo sprintf(
                '<strong>%s</strong> ⭐ <small>(%d głosów)</small>',
                number_format( $average, 1 ),
                $count
            );
        } else {
            echo '<span style="color:#999">Brak ocen</span>';
        }
    }
}, 10, 2 );
