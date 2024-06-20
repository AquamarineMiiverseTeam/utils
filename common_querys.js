const db_con = require("./database_con");
const moment = require("moment");

const common_querys = {
    account_profile_images: [
        "accounts.cdn_profile_normal_image_url",
        "accounts.cdn_profile_happy_image_url",
        "accounts.cdn_profile_like_image_url",
        "accounts.cdn_profile_frustrated_image_url",
        "accounts.cdn_profile_puzzled_image_url",
        "accounts.cdn_profile_surprised_image_url",
    ],

    posts_query: db_con
        .env_db("posts")
        .select(
            "posts.*",
            "accounts.mii_name",
            "accounts.nnid",
            "accounts.username",
            "accounts.cdn_profile_normal_image_url",
            "accounts.cdn_profile_happy_image_url",
            "accounts.cdn_profile_like_image_url",
            "accounts.cdn_profile_frustrated_image_url",
            "accounts.cdn_profile_puzzled_image_url",
            "accounts.cdn_profile_surprised_image_url",
            "accounts.admin",
            "communities.name as community_name",
            "communities.cdn_icon_url",
            "communities.id as community_id",
            db_con.env_db.raw(
                "(SELECT COUNT(empathies.post_id) FROM empathies WHERE empathies.post_id=posts.id) as empathy_count"
            ),
            db_con.env_db.raw(
                "(SELECT COUNT(replies.post_id) FROM replies WHERE replies.post_id=posts.id) as reply_count"
            )
        )
        .innerJoin("account.accounts", "accounts.id", "=", "posts.account_id")
        .innerJoin("communities", "communities.id", "=", "posts.community_id")
        .where({ moderated: 0 }),

    replies_query: db_con.env_db("replies")
        .where({ moderated: 0 })
        .select("replies.*", "accounts.username", "accounts.mii_name")
        .select(db_con.env_db.raw(
            "(SELECT COUNT(empathies.reply_id) FROM empathies WHERE empathies.reply_id=replies.id) as empathy_count"
        ))
        .innerJoin("account.accounts", "accounts.id", "=", "replies.account_id"),

    sub_communities_query: function (parent_community_id) {
        return db_con
            .env_db("communities")
            .select(
                "communities.*",
                db_con.env_db.raw(
                    "(SELECT name FROM communities WHERE communities.id = ?) AS parent_community_name",
                    [parent_community_id]
                ),
                db_con.env_db.raw("COUNT(favorites.community_id) AS favorite_count")
            )
            .where({ parent_community_id: parent_community_id })
            .groupBy("communities.id")
            .leftJoin("favorites", "communities.id", "=", "favorites.community_id");
    },

    is_yeahed: function (account_id) {
        return db_con.env_db.raw(
            `EXISTS ( 
                    SELECT 1
                    FROM empathies
                    WHERE empathies.account_id=?
                    AND empathies.post_id=posts.id
                ) AS empathied_by_user
            `,
            [account_id]
        );
    },

    is_reply_yeahed: function (account_id) {
        return db_con.env_db.raw(
            `EXISTS ( 
                    SELECT 1
                    FROM empathies
                    WHERE empathies.account_id=?
                    AND empathies.reply_id=replies.id
                ) AS empathied_by_user
            `,
            [account_id]
        );
    },

    is_favorited: function (account_id) {
        return db_con.env_db.raw(
            `EXISTS ( 
                    SELECT 1
                    FROM favorites
                    WHERE favorites.account_id=?
                    AND favorites.community_id=communities.id
                ) AS is_favorited
            `,
            [account_id]
        );
    },

    favorite_count: db_con.env_db.raw(
        "(SELECT COUNT(*) FROM favorites WHERE favorites.community_id = communities.id) as favorite_count"
    ),

    popular_community_order_by: function () {
        this.count("*")
            .from("posts")
            .whereRaw("posts.community_id = communities.id")
            .whereBetween("create_time", [
                moment().subtract(5, "days").format("YYYY-MM-DD HH:mm:ss"),
                moment().add(1, "day").format("YYYY-MM-DD HH:mm:ss"),
            ]);
    },

    get_user_stats: function (account_id) {
        return db_con
            .env_db("account.accounts")
            .select(
                db_con.env_db.raw(
                    "(SELECT COUNT(*) FROM posts WHERE posts.account_id = accounts.id AND posts.moderated = 0) as post_count"
                ),
                db_con.env_db.raw(
                    "(SELECT COUNT(*) FROM empathies WHERE empathies.account_id = accounts.id) as empathy_count"
                ),
                db_con.env_db.raw(
                    "(SELECT COUNT(*) FROM relationships WHERE (relationships.from_account_id = accounts.id OR relationships.to_account_id = accounts.id) AND relationships.type = 'friendship' AND relationships.status = 'accepted') as friend_count"
                ),
                db_con.env_db.raw(
                    "(SELECT COUNT(*) FROM relationships WHERE relationships.to_account_id = accounts.id AND relationships.type = 'follow' AND relationships.status = 'accepted') as followers_count"
                ),
                db_con.env_db.raw(
                    "(SELECT COUNT(*) FROM relationships WHERE relationships.from_account_id = accounts.id AND relationships.type = 'follow' AND relationships.status = 'accepted') as following_count"
                )
            )
            .where({
                "accounts.id": account_id,
            })
            .first();
    },
};

module.exports = common_querys;
