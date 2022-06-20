####################过期活动的定时####################

# QQ星系牧场
11 0-23/2 * * * node /scripts/jd_qqxing.js >> /scripts/logs/jd_qqxing.log 2>&1

# 萌虎摇摇乐
0 1,10,20 * * * node /scripts/jd_mhyyl.js >> /scripts/logs/jd_mhyyl.log 2>&1

# 头文字J 助力
11 3,13 * * * node /scripts/jd_mpdzcar_help.js >> /scripts/logs/jd_mpdzcar_help.log 2>&1

# 头文字J 游戏
3 1,10,16 * * * node /scripts/jd_mpdzcar_game.js >> /scripts/logs/jd_mpdzcar_game.log 2>&1

# 头文子J
7 0,9 * * * node /scripts/jd_mpdzcar.js >> /scripts/logs/jd_mpdzcar.log 2>&1

# 京东小魔方 (3.21? 结束)
13 0,10 * * * node /scripts/jd_mf.js >> /scripts/logs/jd_mf.log 2>&1

# 幸运大转盘
10 10,23 * * * node /scripts/jd_market_lottery.js >> /scripts/logs/jd_market_lottery.log 2>&1

# 京东零食街 活动时间：年底
11 11 * * * node /scripts/jd_lsj.js >> /scripts/logs/jd_lsj.log 2>&1

#家庭号(易黑号，默认注释)
#10 6,7 * * * node /scripts/jd_family.js >> /scripts/logs/jd_family.log 2>&1

# 京东到家果园
10 0,3,8,11,17 * * * node /scripts/jd_dj_fruit.js >> /scripts/logs/jd_dj_fruit.log 2>&1
# 京东到家鲜豆任务
10 0 * * * node /scripts/jd_dj_bean.js >> /scripts/logs/jd_dj_bean.log 2>&1
# 京东到家果园水车收水滴
0 */1 * * * node /scripts/jd_dj_fruit_collectWater.js >> /scripts/logs/jd_dj_fruit_collectWater.log 2>&1
# 京东到家鲜豆庄园
10 0 * * * node /scripts/jd_dj_plantBeans.js >> /scripts/logs/jd_dj_plantBeans.log 2>&1
# 京东到家鲜豆庄园收水滴
0 */1 * * * node /scripts/jd_dj_getPoints.js >> /scripts/logs/jd_dj_getPoints.log 2>&1

# 东东世界兑换
3 0,17 * * * node /scripts/jd_ddworld_exchange.js >> /scripts/logs/jd_ddworld_exchange.log 2>&1

# 大赢家之翻翻乐 (没看什么时候结束)
20,40 * * * * node /scripts/jd_big_winner.js >> /scripts/logs/jd_big_winner.log 2>&1

# 进店领豆
0 0 * * * node /scripts/jd_shop.js >> /scripts/logs/jd_shop.log 2>&1

# 京东排行榜
11 0 * * * node /scripts/jd_rankingList.js >> /scripts/logs/jd_rankingList.log 2>&1

# 天天提鹅
30 2-23/3 * * * node /scripts/jd_daily_egg.js >> /scripts/logs/jd_daily_egg.log 2>&1

# 口袋书店
38 8,12,18 * * * node /scripts/jd_bookshop.js >> /scripts/logs/jd_bookshop.log 2>&1

# 城城领现金
3 0,5,9,13,17,22 9-21 1 * node /scripts/jd_city.js >> /scripts/logs/jd_city.log 2>&1

# 过期京豆兑换喜豆
22 9 * * * node /scripts/jd_exchangejxbeans.js >> /scripts/logs/jd_exchangejxbeans.log 2>&1

# 魔方兑换
11 0,20 * * * node /scripts/jd_mf_exchange.js >> /scripts/logs/jd_mf_exchange.log 2>&1

# 集魔方 (京东APP - 新品 - 集魔方)
25 0,13 * * * node /scripts/jd_mofang.js >> /scripts/logs/jd_mofang.log 2>&1

# 京东手机狂欢城 (11.13 结束)
6 0-18/6 * 10-11 * node /scripts/jd_carnivalcity.js >> /scripts/logs/jd_carnivalcity.log 2>&1

# 京东手机狂欢城 助力
0 0,6 9-28 8 * node /scripts/jd_carnivalcity_help.js >> /scripts/logs/jd_carnivalcity_help.log 2>&1

# 跳跳乐瓜分京豆(9.13-9.19)
11 1,12,22 * 9 * node /scripts/jd_jump.js >> /scripts/logs/jd_jump.log 2>&1

# 天天优惠大乐透
9 0 * * * node /scripts/jd_DrawEntrance.js >> /scripts/logs/jd_DrawEntrance.log 2>&1

# 京小鸽吾悦寄 (9.30 结束)
9 1,13 1-30 9 * node /scripts/jd_jxg.js >> /scripts/logs/jd_jxg.log 2>&1

# 财富岛提现
59 11,12,23 * * * node /scripts/jd_cfdtx.js >> /scripts/logs/jd_cfdtx.log 2>&1

# 金机奖投票
35 1,7 8-20 8 * node /scripts/jd_golden_machine.js >> /scripts/logs/jd_golden_machine.log 2>&1

# 沃尔玛畅玩88(7.15-8.8)
0 0,12,18 * 7-8 * node /scripts/jd_walmart.js >> /scripts/logs/jd_walmart.log 2>&1

# 燃动夏季 活动时间：7.8-8.8
20 0,6-23/2 * 7-8 * node /scripts/jd_summer_movement.js >> /scripts/logs/jd_summer_movement.log 2>&1

# 燃动夏季百元守卫战_助力 活动时间：7.8-8.8
14,41 7-14 * 7-8 * node /scripts/jd_summer_movement_help.js >> /scripts/logs/jd_summer_movement_help.log 2>&1

# 京享值PK 活动时间：6.22-7.21
11 0,6,11,16,21 5-21 7 * node /scripts/jd_jxzpk.js >> /scripts/logs/jd_jxzpk.log 2>&1

# 明星小店(星店长)
0 1,21 * * * node /scripts/jd_star_shop.js >> /scripts/logs/jd_star_shop.log 2>&1

# crazyJoy自动每日任务
30 7,23 * * * node /scripts/jd_crazy_joy.js >> /scripts/logs/jd_crazy_joy.log 2>&1

#监控crazyJoy分红
10 12 * * * node /scripts/jd_crazy_joy_bonus.js >> /scripts/logs/jd_crazy_joy_bonus.log 2>&1

# 欧洲狂欢杯 活动时间：###
0 5,10,11 * * * node /scripts/jd_europeancup.js >> /scripts/logs/jd_europeancup.log 2>&1

# 京喜领88元红包(已结束)
#30 1,6,12,21 * * * node /scripts/jd_jxlhb.js >> /scripts/logs/jd_jxlhb.log 2>&1

# 宠汪汪强制为别人助力(旧版.不可用)
#15 10 * * * node /scripts/jd_joy_help.js >> /scripts/logs/jd_joy_help.log 2>&1

# 新潮品牌狂欢(已结束)
#20 1,21 * * * node /scripts/jd_mcxhd.js >> /scripts/logs/jd_mcxhd.log 2>&1

# 家电星推官(已结束)
#0 0 * * * node /scripts/jd_xtg.js >> /scripts/logs/jd_xtg.log 2>&1

# 家电星推官好友互助(已结束)
#0 0 * * * node /scripts/jd_xtg_help.js >> /scripts/logs/jd_xtg_help.log 2>&1

# 618动物联萌(已结束)
#36 0,6-23/2 * * * node /scripts/jd_zoo.js >> /scripts/logs/jd_zoo.log 2>&1

# 618动物联萌收金币(已结束)
#0-59/30 * * * * node /scripts/jd_zooCollect.js >> /scripts/logs/jd_zooCollect.log 2>&1


