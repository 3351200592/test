/*
活动入口：京东APP我的-更多工具-东东农场
东东农场活动链接：https://h5.m.jd.com/babelDiy/Zeus/3KSjXqQabiTuD1cJ28QskrpWoBKT/index.html
互助码shareCode请先手动运行脚本查看打印可看到
一天只能帮助3个人。多出的助力码无效
5 6-18/6 * * * jd_fruit.js
annyooo 修改
*/

const $ = new Env('东东农场');
let cookiesArr = [], cookie = '', notify = '', allMessage = '';
let newShareCodes = [];
let message = '', subTitle = '', option = {}, isFruitFinished = false;

const axios = require('axios')
const format = require('date-fns/format')
const CryptoJS = require('crypto-js')

const thefs = require('fs');
const thepath = './0sendNotify_Annyooo.js'
const notifyTip = $.isNode() ? process.env.MY_NOTIFYTIP : false;
let h5stTool = {
    "initForFarm": "8a2af",
    "taskInitForFarm": "fcb5a",
    "browseAdTaskForFarm": "53f09",
    "firstWaterTaskForFarm": "0cf1e",
    "waterFriendGotAwardForFarm": "d08ff",
    "ddnc_getTreasureBoxAward": "67dfc",
    "totalWaterTaskForFarm": "102f5",
    "gotThreeMealForFarm": "57b30",
    "waterGoodForFarm": "0c010",
    "choiceGoodsForFarm": "5f4ca",
    "gotCouponForFarm": "b1515",
    "gotStageAwardForFarm": "81591",
    "followVenderForBrand": "71547",
    "gotWaterGoalTaskForFarm": "c901b",
    "gotNewUserTaskForFarm": "de8f8",
    "orderTaskGotWaterForFarm": "eed5c",
    "clockInForFarm": "32b94",
    "clockInFollowForFarm": "4a0b4",
    "waterFriendForFarm": "673a0",
    "awardFirstFriendForFarm": "9b655",
    "awardInviteFriendForFarm": "2b5ca",
    "awardCallOrInviteFriendForFarm": "b0b03",
    "userMyCardForFarm": "86ba5",
    "getCallUserCardForFarm": "2ca57",
    "deleteFriendForFarm": "eaf91",
    "gotLowFreqWaterForFarm": "8172b",
    "getFullCollectionReward": "5c767",
    "getOrderPayLotteryWater": "ef089",
    "receiveStageEnergy": "15507",
    "exchangeGood": "52963",
    "farmAssistInit": "92354",
    "myCardInfoForFarm": "157b6",
    "gotPopFirstPurchaseTaskForFarm": "d432f",
    "limitWaterInitForFarm": "6bdc2",
    "ddnc_surpriseModal": "e81c1",
    "friendInitForFarm": "a5a9c",
    "clockInInitForFarm": "08dc3",
    "guideTaskAward": "59bc4"
}

let outpath = './Fruit_HelpOut.json'
$.HelpOuts = { "thisDay": new Date().getDate(), "helpOut": [], "helpFull": [] }
$.Helptext = ""
$.helpJson = {}
$.unLogins = []
$.otherCodes = []
$.myCodes = []
$.myFronts = []
$.helpRunout = []
$.blackIndexs = []
$.notDoWaters = []
$.farmAutoFlag = $.isNode() ? (process.env.farmAutoFlag && process.env.farmAutoFlag.toString() === 'true' ? true : false) : false

// 互助环境变量1 设定固定车头助力码、大小写逗号隔开、连续多个可直接用 - 、如：1-10，可混用如：1,2,3,7-15
let helpFronts = $.isNode() ? (process.env.jd_helpFronts ? process.env.jd_helpFronts : []) : []
// 互助环境变量2 除了固定互助码放前面被助力 之外的账号 设定随机还是顺序助力，true为随机，false为顺序
let helpRandom = $.isNode() ? (process.env.jd_helpRandom ? process.env.jd_helpRandom : false) : false
// 互助环境变量3 不浇水的账号pin，&隔开
let notWaterUsers = $.isNode() ? (process.env.jd_notWaterUsers ? process.env.jd_notWaterUsers : "") : ""

if (helpFronts.length > 0) {
    helpFronts = helpFronts.replace(/，/g, ",").replace(/ /g, "").split(",")
    for (let n in helpFronts) {
        let v = helpFronts[n]
        if (v.match(/\d+-\d+/g) && v.match(/\d+-\d+/g).length > 0) {
            let a = Number(v.split("-")[0].replace(/ /g, ""))
            let b = Number(v.split("-")[1].replace(/ /g, ""))
            if (b > a) {
                let arr = generateArr(a, b)
                for (let t of arr) $.myFronts.push(t)
            }
        } else $.myFronts.push(Number(v))
    }
    $.myFronts = [...new Set($.myFronts)]
}

if (notWaterUsers) {
    console.log(notWaterUsers)
    $.notDoWaters = Array.from(new Set(notWaterUsers.split('&')))
    for (let t in $.notDoWaters) $.notDoWaters[t] = decodeURIComponent($.notDoWaters[t])
}

const retainWater = 100;//保留水滴大于多少g,默认100g;
let jdNotify = false;//是否关闭通知，false打开通知推送，true关闭通知推送
let jdFruitBeanCard = false;//农场使用水滴换豆卡(如果出现限时活动时100g水换20豆,此时比浇水划算,推荐换豆),true表示换豆(不浇水),false表示不换豆(继续浇水),脚本默认是浇水
const JD_API_HOST = 'https://api.m.jd.com/client.action';
const urlSchema = `openjd://virtual?params=%7B%20%22category%22:%20%22jump%22,%20%22des%22:%20%22m%22,%20%22url%22:%20%22https://h5.m.jd.com/babelDiy/Zeus/3KSjXqQabiTuD1cJ28QskrpWoBKT/index.html%22%20%7D`;



!(async () => {
    await requireConfig();
    if (!cookiesArr[0]) {
        $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
        return;
    }
    $.theStart = new Date().getTime()

    for (let i = 0; i < cookiesArr.length; i++) {
        if (cookiesArr[i]) {
            cookie = cookiesArr[i];
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            $.isLogin = true;
            $.nickName = '';
            await TotalBean();
            console.log(`\n\n\n开始【京东账号${$.index}】${$.nickName || $.UserName}\n`);
            if (!$.isLogin) {
                console.log("Cookie已失效. . .")
                $.unLogins.push($.index)

                if ($.isNode()) {
                    await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
                }

                if ($.isNode() && thefs.existsSync(thepath) && notifyTip) {
                    let thenotify = $.isNode() ? require(thepath) : '';
                    await thenotify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
                }

                if ($.myFronts.includes($.index)) $.myFronts = $.myFronts.filter(function (item) { return item !== $.index })

                continue
            }
            message = '';
            subTitle = '';
            option = {};
            $.retry = 0;
            await getUA();
            for (let t in h5stTool) {
                $['h5stTool_' + h5stTool[t]] = ''
            }
            await jdFruit();
            if ($.index % 5 == 0) {
                console.log(`\n\n***************** 每5个账号休息1分钟、已用时${parseInt((new Date().getTime() - $.theStart) / 1000)}秒 *****************\n`)
                await $.wait(parseInt(Math.random() * 5000 + 60000, 10))
            }
        }

        //if ($.isNode() && thefs.existsSync(thepath) && notifyTip && allMessage && $.ctrTemp){
        //    let thenotify = $.isNode() ? require(thepath) : '';
        //    await thenotify.sendNotify(`${$.name}`, `${allMessage}`)
        //}

    }

    console.log(`\n\n***************** 日常任务结束、已用时${parseInt((new Date().getTime() - $.theStart) / 1000)}秒 *****************`)
    await getCodesCache()

    console.log(`\n\n\n======================= 开始互助 =======================`);
    $.heplTimes = 0
    for (let i = 0; i < cookiesArr.length; i++) {
        if (cookiesArr[i]) {
            cookie = cookiesArr[i];
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            $.nickName = '';
            console.log(`\n*********开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
            if ($.unLogins.includes($.index)) {
                console.log("Cookie已失效. . .")
                continue
            }
            if ($.helpRunout.includes($.index) || $.helpOut.includes($.UserName)) {
                console.log("助力次数耗尽、不执行此账号. . .")
                continue
            }
            if ($.blackIndexs.includes($.index)) {
                console.log("农场数据异常、不执行此账号. . .")
                continue
            }
            await shareCodesFormat();
            if (!newShareCodes.length) {
                console.log("已无账号需要助力，助力结束")
                break
            }
            $.heplTimes = $.heplTimes + 1
            await getAwardInviteFriend();
            await turntableFarm(1); //天天抽奖得好礼
            await masterHelpShare();//助力好友
            if ($.heplTimes % 5 == 0) {
                console.log(`\n\n***************** 每请求5个账号休息1分钟、已用时${parseInt((new Date().getTime() - $.theStart) / 1000)}秒 *****************`)
                await $.wait(parseInt(Math.random() * 5000 + 60000, 10))
            }
        }
    }

    thefs.writeFile(outpath, JSON.stringify($.HelpOuts), function (err) {
        if (err) console.log(`\n\n写入缓存失败：${err}`)
        else console.log("\n\n写入缓存成功 . . .")
    })
    await $.wait(1000)

    if ($.isNode() && allMessage && $.ctrTemp) {
        await notify.sendNotify(`${$.name}`, `${allMessage}`)
    }
})().catch((e) => { $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '') }).finally(() => { $.done(); })




async function fruitExchange() {
    let body = {}
    return new Promise(async resolve => {
        $.get(await taskUrl("gotCouponForFarm", body), async (err, resp, data) => {
            try {
                if (err) {
                    console.log('兑换 API查询请求失败‼️‼️', JSON.stringify(err))
                } else {
                    let res = $.toObj(data, data);
                    // console.log(data)
                    if (typeof res == 'object') {
                        if (res.hongbaoResult?.resultCode == 200) {
                            let msg = `【京东账号${$.index}】${$.nickName || $.UserName}\n等级${$.Level}：${$.fuitName} 收取成功✅`
                            if (res.hongbaoResult?.hongBao?.discount) msg += `\n已兑换红包：${parseInt(res.hongbaoResult.hongBao.discount)}元🧧\n红包有效期：${Math.round((parseInt(res.hongbaoResult.hongBao.endTime - res.hongbaoResult.hongBao.beginTime) / 1000) / 3600 / 24)}天⏰\n请尽快使用红包`
                            // console.log(msg)

                            $.msg($.name, ``, `${msg}`);
                            if ($.isNode()) {
                                await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已自动领取`, `${msg}`);
                            }
                            if ($.isNode() && thefs.existsSync(thepath) && notifyTip) {
                                let thenotify = $.isNode() ? require(thepath) : '';
                                await thenotify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已自动领取`, `${msg}`);
                            }

                            resolve(true)
                        } else {
                            let msg = ``
                            if (res.hongbaoAmountTipsPop?.tipsPopWord) {
                                msg = res.hongbaoAmountTipsPop.tipsPopWord.indexOf("今日兑换人数已达上限") > -1 ? "兑换人数已达上限" : `${res.hongbaoAmountTipsPop.tipsPopWord}`
                            } else {
                                msg = res.riskTips || data
                            }
                            console.log(`收取失败：${msg}❌`)
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(false)
            }
        })
    })
}

async function plantFruit() {
    let goods = $.farmInfo.farmLevelWinGoods
    let newGoods = []
    let flag = false
    Object.keys(goods).map(key => { newGoods.push(goods[key]) })
    newGoods.reverse()
    for (let i = 0; i < newGoods.length; i++) {
        if (newGoods[i].length) {
            let item = newGoods[i][Math.floor(Math.random() * newGoods[i].length)]
            flag = await choiceGoodsForFarm(item.type)
            break
        }
    }
    return flag
}


async function choiceGoodsForFarm(goodsType) {
    let body = { "imageUrl": "", "nickName": "", "shareCode": "", "goodsType": goodsType, "type": "0", "sid": "c36b696374ea8e2c990374be2e93ab9w" }
    return new Promise(async resolve => {
        $.get(await taskUrl("choiceGoodsForFarm", body), async (err, resp, data) => {
            try {
                if (err) {
                    console.log('种植 API查询请求失败‼️‼️', JSON.stringify(err))
                } else {
                    let res = $.toObj(data, data);
                    if (typeof res == 'object') {
                        if (res.code == 0 && res.farmUserPro && res.farmUserPro.treeState == 1) {
                            console.log(`随机种植成功✅ 获得水滴${res.choiceEnergy}g💧`)
                            console.log(`等级${res.farmUserPro.prizeLevel}「${res.farmUserPro.name}」`)
                            console.log(`成熟需要：${res.farmUserPro.treeTotalEnergy}g💧`)
                            resolve(true)
                        } else {
                            console.log(`种植失败：${res.message || data}❌`)
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(false)
            }
        })
    })
}



async function jdFruit() {
    subTitle = `【京东账号${$.index}】${$.nickName || $.UserName}`;
    try {

        await initForFarm();
        if ($.farmInfo && $.farmInfo.farmUserPro) {
            $.thisCode = $.farmInfo.farmUserPro.shareCode
            $.fuitName = `${$.farmInfo.farmUserPro.name.replace(/(^\s*)|(\s*$)/g, "")}`
            $.Level = $.farmInfo.farmUserPro.prizeLevel
            message = `【水果名称】${$.fuitName}\n`;
            console.log(`互助码:${$.thisCode}\n`);

            let thisarr = []
            thisarr.push($.index)
            thisarr.push($.thisCode)
            thisarr.push($.UserName)
            if (checkArr($.otherCodes, $.thisCode) == -1 && !$.myFronts.includes($.index)) $.otherCodes.push(thisarr)
            if (checkArr($.myCodes, $.thisCode) == -1 && $.myFronts.length > 0 && $.myFronts.includes($.index)) $.myCodes.push(thisarr)

            console.log(`\n【已成功兑换水果】${$.farmInfo.farmUserPro.winTimes}次`);
            message += `【已兑换水果】${$.farmInfo.farmUserPro.winTimes}次\n`;
            if ($.farmInfo.treeState === 2 || $.farmInfo.treeState === 3) {
                let ff = false
                if ($.farmAutoFlag === true) {
                    if ($.farmInfo.treeState === 2) {
                        console.log(`\n等级${$.Level}「${$.fuitName}」已可收取\n开始收取并兑换红包....\n`)
                        ff = await fruitExchange()
                        if (ff) {
                            await $.wait(1000)
                            await initForFarm()
                            if ($.farmInfo && $.farmInfo.farmLevelWinGoods) {
                                console.log(`\n开始随机种植....\n`)
                                await plantFruit()
                            }
                        }
                    } else if ($.farmInfo.treeState === 3) {
                        console.log(`\n红包已领取、未种植，开始随机种植....\n`)
                        ff = await plantFruit()
                    }
                }

                if (!ff) {
                    option['open-url'] = urlSchema;
                    $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.fuitName}已可领取\n入口：京东APP-我的-东东农场`, option);
                    if ($.isNode()) {
                        await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.fuitName}已可领取\n入口：京东APP-我的-东东农场`);
                    }

                    if ($.isNode() && thefs.existsSync(thepath) && notifyTip) {
                        let thenotify = $.isNode() ? require(thepath) : '';
                        await thenotify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.fuitName}已可领取\n入口：京东APP-我的-东东农场`);
                    }
                }
                // return
            } else if ($.farmInfo.treeState === 1) {
                console.log(`${$.fuitName}种植中...`)
            } else if ($.farmInfo.treeState === 0) {
                //已下单购买, 但未开始种植新的水果
                option['open-url'] = urlSchema;
                $.msg($.name, ``, `【京东账号${$.index}】 ${$.nickName || $.UserName}\n【提醒⏰】您忘了种植新的水果\n请去京东APP选购并种植新的水果\n入口：京东APP-我的-东东农场`, option);
                if ($.isNode()) {
                    await notify.sendNotify(`${$.name} - 您忘了种植新的水果`, `京东账号${$.index} ${$.nickName}\n【提醒⏰】您忘了种植新的水果\n请去京东APP选购并种植新的水果\n入口：京东APP-我的-东东农场`);
                }

                if ($.isNode() && thefs.existsSync(thepath) && notifyTip) {
                    let thenotify = $.isNode() ? require(thepath) : '';
                    await thenotify.sendNotify(`${$.name} - 您忘了种植新的水果`, `京东账号${$.index} ${$.nickName}\n【提醒⏰】您忘了种植新的水果\n请去京东APP选购并种植新的水果\n入口：京东APP-我的-东东农场`);
                }

                // return
            }
            await doDailyTask();
            if (!$.notDoWaters.includes($.UserName)) await doTenWater();//浇水十次
            else console.log(`\n已设定该账号不进行浇水，跳过浇水十次执行...\n`)
            await getFirstWaterAward();//领取首次浇水奖励
            await getTenWaterAward();//领取10浇水奖励
            await getWaterFriendGotAward();//领取为2好友浇水奖励
            await duck();
            if (!$.notDoWaters.includes($.UserName)) await doTenWaterAgain();//再次浇水
            else console.log(`\n已设定该账号不进行浇水，跳过再次浇水执行...\n`)
            await predictionFruit();//预测水果成熟时间
        } else {
            console.log($.farmInfo)
            console.log(`初始化农场数据异常, 请登录京东app查看农场是否正常`);
            message += `数据异常, 请登录京东app查看农场是否正常\n`;
            if (!$.blackIndexs.includes($.index)) $.blackIndexs.push($.index)
            // if ($.retry < 3) {
            //     $.retry++
            //     console.log(`等待10秒后重试,第:${$.retry}次`);
            //     await $.wait(10000);
            //     await jdFruit();
            // }
            // message = `【数据异常】请手动登录京东app查看此账号${$.name}是否正常`;
        }
    } catch (e) {
        console.log(`任务执行异常，请检查执行日志 ‼️‼️`);
        $.logErr(e);
        const errMsg = `京东账号${$.index} ${$.nickName || $.UserName}\n任务执行异常，请检查执行日志 ‼️‼️`;
        if ($.isNode()) await notify.sendNotify(`${$.name}`, errMsg);
        $.msg($.name, '', `${errMsg}`)
    }
    await showMsg();
}

async function doDailyTask() {
    await taskInitForFarm();
    console.log(`开始签到`);
    if (!$.farmTask || /活动火爆/.test($.toStr($.farmTask, $.farmTask))) console.log($.farmTask)
    if (!$.farmTask || /活动火爆/.test($.toStr($.farmTask, $.farmTask))) return
    if ($.farmTask.signInit) {
        if (!$.farmTask.signInit.todaySigned) {
            await signForFarm(); //签到
            if ($.signResult && $.signResult.code === "0") {
                console.log(`【签到成功】获得${$.signResult.amount}g💧`)
                //message += `【签到成功】获得${$.signResult.amount}g💧\n`//连续签到${signResult.signDay}天
            } else {
                // message += `签到失败,详询日志\n`;
                console.log(`签到结果:  ${JSON.stringify($.signResult)}`);
            }
        } else {
            console.log(`今天已签到,连续签到${$.farmTask.signInit.totalSigned},下次签到可得${$.farmTask.signInit.signEnergyEachAmount}g\n`);
        }
    }
    // 被水滴砸中
    console.log(`被水滴砸中： ${$.farmInfo.todayGotWaterGoalTask.canPop ? '是' : '否'}`);
    if ($.farmInfo.todayGotWaterGoalTask.canPop) {
        await gotWaterGoalTaskForFarm();
        if ($.goalResult && $.goalResult.code === '0') {
            console.log(`【被水滴砸中】获得${$.goalResult.addEnergy}g💧\\n`);
            // message += `【被水滴砸中】获得${$.goalResult.addEnergy}g💧\n`
        }
    }
    console.log(`签到结束,开始广告浏览任务`);
    if ($.farmTask.gotBrowseTaskAdInit.f) {
        console.log(`今天已经做过浏览广告任务\n`);
    } else {
        let adverts = $.farmTask.gotBrowseTaskAdInit.userBrowseTaskAds
        let browseReward = 0
        let browseSuccess = 0
        let browseFail = 0
        for (let advert of adverts) { //开始浏览广告
            if (advert.limit <= advert.hadFinishedTimes) {
                // browseReward+=advert.reward
                console.log(`${advert.mainTitle}+ ' 已完成`);//,获得${advert.reward}g
                continue;
            }
            console.log('正在进行广告浏览任务: ' + advert.mainTitle);
            await browseAdTaskForFarm(advert.advertId, 0);
            if ($.browseResult && $.browseResult.code === '0') {
                console.log(`${advert.mainTitle}浏览任务完成`);
                //领取奖励
                await browseAdTaskForFarm(advert.advertId, 1);
                if ($.browseRwardResult && $.browseRwardResult.code === '0') {
                    console.log(`领取浏览${advert.mainTitle}广告奖励成功,获得${$.browseRwardResult.amount}g`)
                    browseReward += $.browseRwardResult.amount
                    browseSuccess++
                } else {
                    browseFail++
                    console.log(`领取浏览广告奖励结果:  ${JSON.stringify($.browseRwardResult)}`)
                }
            } else {
                browseFail++
                console.log(`广告浏览任务结果:   ${JSON.stringify($.browseResult)}`);
            }
        }
        if (browseFail > 0) {
            console.log(`【广告浏览】完成${browseSuccess}个,失败${browseFail},获得${browseReward}g💧\\n`);
            // message += `【广告浏览】完成${browseSuccess}个,失败${browseFail},获得${browseReward}g💧\n`;
        } else {
            console.log(`【广告浏览】完成${browseSuccess}个,获得${browseReward}g💧\n`);
            // message += `【广告浏览】完成${browseSuccess}个,获得${browseReward}g💧\n`;
        }
    }
    //定时领水
    if (!$.farmTask.gotThreeMealInit.f) {
        //
        await gotThreeMealForFarm();
        if ($.threeMeal && $.threeMeal.code === "0") {
            console.log(`【定时领水】获得${$.threeMeal.amount}g💧\n`);
            // message += `【定时领水】获得${$.threeMeal.amount}g💧\n`;
        } else {
            // message += `【定时领水】失败,详询日志\n`;
            console.log(`定时领水成功结果:  ${JSON.stringify($.threeMeal)}`);
        }
    } else {
        console.log('当前不在定时领水时间断或者已经领过\n')
    }
    //给好友浇水
    if (!$.farmTask.waterFriendTaskInit.f) {
        if ($.farmTask.waterFriendTaskInit.waterFriendCountKey < $.farmTask.waterFriendTaskInit.waterFriendMax) {
            await doFriendsWater();
        }
    } else {
        console.log(`给${$.farmTask.waterFriendTaskInit.waterFriendMax}个好友浇水任务已完成\n`)
    }
    // await Promise.all([
    //   clockInIn(),//打卡领水
    //   executeWaterRains(),//水滴雨
    //   masterHelpShare(),//助力好友
    //   getExtraAward(),//领取额外水滴奖励
    //   turntableFarm()//天天抽奖得好礼
    // ])
    await clockInIn();//打卡领水
    await executeWaterRains();//水滴雨
    await getExtraAward();//领取新版水滴
    await turntableFarm()//天天抽奖得好礼
}

async function predictionFruit() {
    console.log('开始预测水果成熟时间\n');
    await initForFarm();
    await taskInitForFarm();
    if (!$.farmTask || /活动火爆/.test($.toStr($.farmTask, $.farmTask))) console.log($.farmTask)
    if (!$.farmTask || /活动火爆/.test($.toStr($.farmTask, $.farmTask))) return
    if ($.farmInfo?.farmUserPro && $.farmTask?.totalWaterTaskInit) {
        let waterEveryDayT = $.farmTask.totalWaterTaskInit.totalWaterTaskTimes;//今天到到目前为止，浇了多少次水
        message += `【今日共浇水】${waterEveryDayT}次\n`;
        message += `【剩余 水滴】${$.farmInfo.farmUserPro.totalEnergy}g💧\n`;
        message += `【水果🍉进度】${(($.farmInfo.farmUserPro.treeEnergy / $.farmInfo.farmUserPro.treeTotalEnergy) * 100).toFixed(2)}%，已浇水${$.farmInfo.farmUserPro.treeEnergy / 10}次,还需${($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy) / 10}次\n`
        if ($.farmInfo.toFlowTimes > ($.farmInfo.farmUserPro.treeEnergy / 10)) {
            message += `【开花进度】再浇水${$.farmInfo.toFlowTimes - $.farmInfo.farmUserPro.treeEnergy / 10}次开花\n`
        } else if ($.farmInfo.toFruitTimes > ($.farmInfo.farmUserPro.treeEnergy / 10)) {
            message += `【结果进度】再浇水${$.farmInfo.toFruitTimes - $.farmInfo.farmUserPro.treeEnergy / 10}次结果\n`
        }
        // 预测n天后水果课可兑换功能
        let waterTotalT = ($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy - $.farmInfo.farmUserPro.totalEnergy) / 10;//一共还需浇多少次水

        let waterD = Math.ceil(waterTotalT / waterEveryDayT);

        message += `【预测】${waterD === 1 ? '明天' : waterD === 2 ? '后天' : waterD + '天之后'}(${timeFormat(24 * 60 * 60 * 1000 * waterD + Date.now())}日)可兑换水果🍉`
    }
}

//浇水十次
async function doTenWater() {
    jdFruitBeanCard = $.getdata('jdFruitBeanCard') ? $.getdata('jdFruitBeanCard') : jdFruitBeanCard;
    if ($.isNode() && process.env.FRUIT_BEAN_CARD) {
        jdFruitBeanCard = process.env.FRUIT_BEAN_CARD;
    }
    await myCardInfoForFarm();
    if (!$.myCardInfoRes || !$.farmTask || /活动火爆/.test($.toStr($.farmTask, $.farmTask))) return
    const { fastCard, doubleCard, beanCard, signCard } = $.myCardInfoRes;
    if (`${jdFruitBeanCard}` === 'true' && JSON.stringify($.myCardInfoRes).match(`限时翻倍`) && beanCard > 0) {
        console.log(`您设置的是使用水滴换豆卡，且背包有水滴换豆卡${beanCard}张, 跳过10次浇水任务`)
        return
    }
    if ($.farmTask.totalWaterTaskInit.totalWaterTaskTimes < $.farmTask.totalWaterTaskInit.totalWaterTaskLimit) {
        console.log(`\n准备浇水十次`);
        let waterCount = 0;
        isFruitFinished = false;
        for (; waterCount < $.farmTask.totalWaterTaskInit.totalWaterTaskLimit - $.farmTask.totalWaterTaskInit.totalWaterTaskTimes; waterCount++) {
            console.log(`第${waterCount + 1}次浇水`);
            await waterGoodForFarm();
            if ($.waterResult) console.log(`本次浇水结果:   ${JSON.stringify($.waterResult)}`);
            if ($.waterResult && $.waterResult.code === '0') {
                console.log(`剩余水滴${$.waterResult.totalEnergy}g`);
                if ($.waterResult.finished) {
                    // 已证实，waterResult.finished为true，表示水果可以去领取兑换了
                    isFruitFinished = true;
                    break
                } else {
                    if ($.waterResult.totalEnergy < 10) {
                        console.log(`水滴不够，结束浇水`)
                        break
                    }
                    await gotStageAward();//领取阶段性水滴奖励
                }
            } else {
                console.log('浇水出现失败异常,跳出不在继续浇水')
                break;
            }
        }
        if (isFruitFinished) {
            $.fuitName = `${$.farmInfo.farmUserPro.name.replace(/(^\s*)|(\s*$)/g, "")}`
            $.Level = $.farmInfo.farmUserPro.prizeLevel
            let ff = false
            if ($.farmAutoFlag === true) {
                await $.wait(1000)
                await initForFarm()
                if ($.farmInfo && $.farmInfo.treeState === 2) {
                    console.log(`\n等级${$.Level}「${$.fuitName}」已可收取\n开始收取并兑换红包....\n`)
                    ff = await fruitExchange()
                    if (ff) {
                        await $.wait(1000)
                        await initForFarm()
                        if ($.farmInfo && $.farmInfo.farmLevelWinGoods) {
                            console.log(`\n开始随机种植....\n`)
                            await plantFruit()
                        }
                    }
                }
            }
            if (!ff) {
                option['open-url'] = urlSchema;
                $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.fuitName}已可领取\n入口：京东APP-我的-东东农场`, option);
                $.done();
                if ($.isNode()) {
                    await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName || $.UserName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.fuitName}已可领取\n入口：京东APP-我的-东东农场`);
                }

                if ($.isNode() && thefs.existsSync(thepath) && notifyTip) {
                    let thenotify = $.isNode() ? require(thepath) : '';
                    await thenotify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName || $.UserName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.fuitName}已可领取\n入口：京东APP-我的-东东农场`);
                }
            }
        }
    } else {
        console.log('\n今日已完成10次浇水任务\n');
    }
}

//领取首次浇水奖励
async function getFirstWaterAward() {
    await taskInitForFarm();
    //领取首次浇水奖励
    if (!$.farmTask || /活动火爆/.test($.toStr($.farmTask, $.farmTask))) return
    if (!$.farmTask.firstWaterInit.f && $.farmTask.firstWaterInit.totalWaterTimes > 0) {
        await firstWaterTaskForFarm();
        if ($.firstWaterReward && $.firstWaterReward.code === '0') {
            console.log(`【首次浇水奖励】获得${$.firstWaterReward.amount}g💧\n`);
            // message += `【首次浇水奖励】获得${$.firstWaterReward.amount}g💧\n`;
        } else {
            // message += '【首次浇水奖励】领取奖励失败,详询日志\n';
            console.log(`领取首次浇水奖励结果:  ${JSON.stringify($.firstWaterReward)}`);
        }
    } else {
        console.log('首次浇水奖励已领取\n')
    }
}

//领取十次浇水奖励
async function getTenWaterAward() {
    //领取10次浇水奖励
    if ($.farmTask && !/活动火爆/.test($.toStr($.farmTask, $.farmTask))) {
        if (!$.farmTask.totalWaterTaskInit.f && $.farmTask.totalWaterTaskInit.totalWaterTaskTimes >= $.farmTask.totalWaterTaskInit.totalWaterTaskLimit) {
            await totalWaterTaskForFarm();
            if ($.totalWaterReward && $.totalWaterReward.code === '0') {
                console.log(`【十次浇水奖励】获得${$.totalWaterReward.totalWaterTaskEnergy}g💧\n`);
                // message += `【十次浇水奖励】获得${$.totalWaterReward.totalWaterTaskEnergy}g💧\n`;
            } else {
                // message += '【十次浇水奖励】领取奖励失败,详询日志\n';
                console.log(`领取10次浇水奖励结果:  ${JSON.stringify($.totalWaterReward)}`);
            }
        } else if ($.farmTask.totalWaterTaskInit.totalWaterTaskTimes < $.farmTask.totalWaterTaskInit.totalWaterTaskLimit) {
            // message += `【十次浇水奖励】任务未完成，今日浇水${$.farmTask.totalWaterTaskInit.totalWaterTaskTimes}次\n`;
            console.log(`【十次浇水奖励】任务未完成，今日浇水${$.farmTask.totalWaterTaskInit.totalWaterTaskTimes}次\n`);
        }
        console.log('finished 水果任务完成!');
    }
}

//再次浇水
async function doTenWaterAgain() {
    console.log('开始检查剩余水滴能否再次浇水再次浇水\n');
    await initForFarm();
    // if (!$.farmInfo) return
    let totalEnergy = $.farmInfo?.farmUserPro?.totalEnergy || ""
    if (!totalEnergy) return
    console.log(`剩余水滴${totalEnergy}g\n`);
    await myCardInfoForFarm();
    if (!$.myCardInfoRes) return
    const { fastCard, doubleCard, beanCard, signCard } = $.myCardInfoRes;
    console.log(`背包已有道具:\n快速浇水卡:${fastCard === -1 ? '未解锁' : fastCard + '张'}\n水滴翻倍卡:${doubleCard === -1 ? '未解锁' : doubleCard + '张'}\n水滴换京豆卡:${beanCard === -1 ? '未解锁' : beanCard + '张'}\n加签卡:${signCard === -1 ? '未解锁' : signCard + '张'}\n`)
    if (totalEnergy >= 100 && doubleCard > 0) {
        //使用翻倍水滴卡
        for (let i = 0; i < new Array(doubleCard).fill('').length; i++) {
            await userMyCardForFarm('doubleCard');
            console.log(`使用翻倍水滴卡结果:${JSON.stringify($.userMyCardRes)}`);
        }
        await initForFarm();
        if (!$.farmInfo) return
        totalEnergy = $.farmInfo.farmUserPro.totalEnergy;
    }
    if (signCard > 0) {
        //使用加签卡
        for (let i = 0; i < new Array(signCard).fill('').length; i++) {
            await userMyCardForFarm('signCard');
            console.log(`使用加签卡结果:${JSON.stringify($.userMyCardRes)}`);
        }
        await initForFarm();
        if (!$.farmInfo?.farmUserPro) return
        totalEnergy = $.farmInfo.farmUserPro.totalEnergy;
    }
    jdFruitBeanCard = $.getdata('jdFruitBeanCard') ? $.getdata('jdFruitBeanCard') : jdFruitBeanCard;
    if ($.isNode() && process.env.FRUIT_BEAN_CARD) {
        jdFruitBeanCard = process.env.FRUIT_BEAN_CARD;
    }
    if (`${jdFruitBeanCard}` === 'true' && JSON.stringify($.myCardInfoRes).match('限时翻倍')) {
        console.log(`\n您设置的是水滴换豆功能,现在为您换豆`);
        if (totalEnergy >= 100 && $.myCardInfoRes.beanCard > 0) {
            //使用水滴换豆卡
            await userMyCardForFarm('beanCard');
            console.log(`使用水滴换豆卡结果:${JSON.stringify($.userMyCardRes)}`);
            if ($.userMyCardRes && $.userMyCardRes.code === '0') {
                message += `【水滴换豆卡】获得${$.userMyCardRes.beanCount}个京豆\n`;
                return
            }
        } else {
            console.log(`您目前水滴:${totalEnergy}g,水滴换豆卡${$.myCardInfoRes.beanCard}张,暂不满足水滴换豆的条件,为您继续浇水`)
        }
    }
    // if (totalEnergy > 100 && $.myCardInfoRes.fastCard > 0) {
    //   //使用快速浇水卡
    //   await userMyCardForFarm('fastCard');
    //   console.log(`使用快速浇水卡结果:${JSON.stringify($.userMyCardRes)}`);
    //   if ($.userMyCardRes && $.userMyCardRes.code === '0') {
    //     console.log(`已使用快速浇水卡浇水${$.userMyCardRes.waterEnergy}g`);
    //   }
    //   await initForFarm();
    //   totalEnergy  = $.farmInfo.farmUserPro.totalEnergy;
    // }
    // 所有的浇水(10次浇水)任务，获取水滴任务完成后，如果剩余水滴大于等于60g,则继续浇水(保留部分水滴是用于完成第二天的浇水10次的任务)
    let overageEnergy = totalEnergy - retainWater;
    if (totalEnergy >= ($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy)) {
        //如果现有的水滴，大于水果可兑换所需的对滴(也就是把水滴浇完，水果就能兑换了)
        isFruitFinished = false;
        for (let i = 0; i < ($.farmInfo.farmUserPro.treeTotalEnergy - $.farmInfo.farmUserPro.treeEnergy) / 10; i++) {
            await waterGoodForFarm();
            console.log(`本次浇水结果(水果马上就可兑换了):   ${JSON.stringify($.waterResult)}`);
            if ($.waterResult && $.waterResult.code === '0') {
                console.log('\n浇水10g成功\n');
                if ($.waterResult.finished) {
                    // 已证实，waterResult.finished为true，表示水果可以去领取兑换了
                    isFruitFinished = true;
                    break
                } else {
                    console.log(`目前水滴【${$.waterResult.totalEnergy}】g,继续浇水，水果马上就可以兑换了`)
                }
            } else {
                console.log('浇水出现失败异常,跳出不在继续浇水')
                break;
            }
        }
        if (isFruitFinished) {
            $.fuitName = `${$.farmInfo.farmUserPro.name.replace(/(^\s*)|(\s*$)/g, "")}`
            $.Level = $.farmInfo.farmUserPro.prizeLevel
            let ff = false
            if ($.farmAutoFlag === true) {
                await $.wait(1000)
                await initForFarm()
                if ($.farmInfo && $.farmInfo.treeState === 2) {
                    console.log(`\n等级${$.Level}「${$.fuitName}」已可收取\n开始收取并兑换红包....\n`)
                    ff = await fruitExchange()
                    if (ff) {
                        await $.wait(1000)
                        await initForFarm()
                        if ($.farmInfo && $.farmInfo.farmLevelWinGoods) {
                            console.log(`\n开始随机种植....\n`)
                            await plantFruit()
                        }
                    }
                }
            }
            if (!ff) {
                option['open-url'] = urlSchema;
                $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.fuitName}已可领取\n入口：京东APP-我的-东东农场`, option);
                $.done();
                if ($.isNode()) {
                    await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.fuitName}已可领取\n入口：京东APP-我的-东东农场`);
                }

                if ($.isNode() && thefs.existsSync(thepath) && notifyTip) {
                    let thenotify = $.isNode() ? require(thepath) : '';
                    await thenotify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.fuitName}已可领取\n入口：京东APP-我的-东东农场`);
                }
            }
        }
    } else if (overageEnergy >= 10) {
        console.log("目前剩余水滴：【" + totalEnergy + "】g，可继续浇水");
        isFruitFinished = false;
        for (let i = 0; i < parseInt(overageEnergy / 10); i++) {
            await waterGoodForFarm();
            console.log(`本次浇水结果:   ${JSON.stringify($.waterResult)}`);
            if ($.waterResult && $.waterResult.code === '0') {
                console.log(`\n浇水10g成功,剩余${$.waterResult.totalEnergy}\n`)
                if ($.waterResult.finished) {
                    // 已证实，waterResult.finished为true，表示水果可以去领取兑换了
                    isFruitFinished = true;
                    break
                } else {
                    await gotStageAward()
                }
            } else {
                console.log('浇水出现失败异常,跳出不在继续浇水')
                break;
            }
        }
        if (isFruitFinished) {
            $.fuitName = `${$.farmInfo.farmUserPro.name.replace(/(^\s*)|(\s*$)/g, "")}`
            $.Level = $.farmInfo.farmUserPro.prizeLevel
            let ff = false
            if ($.farmAutoFlag === true) {
                await $.wait(1000)
                await initForFarm()
                if ($.farmInfo && $.farmInfo.treeState === 2) {
                    console.log(`\n等级${$.Level}「${$.fuitName}」已可收取\n开始收取并兑换红包....\n`)
                    ff = await fruitExchange()
                    if (ff) {
                        await $.wait(1000)
                        await initForFarm()
                        if ($.farmInfo && $.farmInfo.farmLevelWinGoods) {
                            console.log(`\n开始随机种植....\n`)
                            await plantFruit()
                        }
                    }
                }
            }
            if (!ff) {
                option['open-url'] = urlSchema;
                $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.fuitName}已可领取\n入口：京东APP-我的-东东农场`, option);
                $.done();
                if ($.isNode()) {
                    await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.fuitName}已可领取\n入口：京东APP-我的-东东农场`);
                }

                if ($.isNode() && thefs.existsSync(thepath) && notifyTip) {
                    let thenotify = $.isNode() ? require(thepath) : '';
                    await thenotify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}水果已可领取`, `京东账号${$.index} ${$.nickName}\n${$.fuitName}已可领取\n入口：京东APP-我的-东东农场`);
                }
            }
        }
    } else {
        console.log("目前剩余水滴：【" + totalEnergy + "】g,不再继续浇水,保留部分水滴用于完成第二天【十次浇水得水滴】任务")
    }
}

//领取阶段性水滴奖励
function gotStageAward() {
    return new Promise(async resolve => {
        if ($.waterResult.waterStatus === 0 && $.waterResult.treeEnergy === 10) {
            console.log('果树发芽了,奖励30g水滴');
            await gotStageAwardForFarm('1');
            console.log(`浇水阶段奖励1领取结果 ${JSON.stringify($.gotStageAwardForFarmRes)}`);
            if ($.gotStageAwardForFarmRes && $.gotStageAwardForFarmRes.code === '0') {
                // message += `【果树发芽了】奖励${$.gotStageAwardForFarmRes.addEnergy}\n`;
                console.log(`【果树发芽了】奖励${$.gotStageAwardForFarmRes.addEnergy}\n`);
            }
        } else if ($.waterResult.waterStatus === 1) {
            console.log('果树开花了,奖励40g水滴');
            await gotStageAwardForFarm('2');
            console.log(`浇水阶段奖励2领取结果 ${JSON.stringify($.gotStageAwardForFarmRes)}`);
            if ($.gotStageAwardForFarmRes && $.gotStageAwardForFarmRes.code === '0') {
                // message += `【果树开花了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`;
                console.log(`【果树开花了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`);
            }
        } else if ($.waterResult.waterStatus === 2) {
            console.log('果树长出小果子啦, 奖励50g水滴');
            await gotStageAwardForFarm('3');
            console.log(`浇水阶段奖励3领取结果 ${JSON.stringify($.gotStageAwardForFarmRes)}`)
            if ($.gotStageAwardForFarmRes && $.gotStageAwardForFarmRes.code === '0') {
                // message += `【果树结果了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`;
                console.log(`【果树结果了】奖励${$.gotStageAwardForFarmRes.addEnergy}g💧\n`);
            }
        }
        resolve()
    })
}

//天天抽奖活动
async function turntableFarm(flag = 0) {
    await initForTurntableFarm();
    if ($.initForTurntableFarmRes && $.initForTurntableFarmRes.code === '0') {
        //领取定时奖励 //4小时一次
        let { timingIntervalHours, timingLastSysTime, sysTime, timingGotStatus, remainLotteryTimes, turntableInfos } = $.initForTurntableFarmRes;
        if (flag == 0) {
            if (!timingGotStatus) {
                console.log(`是否到了领取免费赠送的抽奖机会----${sysTime > (timingLastSysTime + 60 * 60 * timingIntervalHours * 1000)}`)
                if (sysTime > (timingLastSysTime + 60 * 60 * timingIntervalHours * 1000)) {
                    await timingAwardForTurntableFarm();
                    console.log(`领取定时奖励结果${JSON.stringify($.timingAwardRes)}`);
                    await initForTurntableFarm();
                    remainLotteryTimes = $.initForTurntableFarmRes.remainLotteryTimes;
                } else {
                    console.log(`免费赠送的抽奖机会未到时间`)
                }
            } else {
                console.log('4小时候免费赠送的抽奖机会已领取')
            }
            if ($.initForTurntableFarmRes.turntableBrowserAds && $.initForTurntableFarmRes.turntableBrowserAds.length > 0) {
                for (let index = 0; index < $.initForTurntableFarmRes.turntableBrowserAds.length; index++) {
                    if (!$.initForTurntableFarmRes.turntableBrowserAds[index].status) {
                        console.log(`开始浏览天天抽奖的第${index + 1}个逛会场任务`)
                        await browserForTurntableFarm(1, $.initForTurntableFarmRes.turntableBrowserAds[index].adId);
                        if ($.browserForTurntableFarmRes && $.browserForTurntableFarmRes.code === '0' && $.browserForTurntableFarmRes.status) {
                            console.log(`第${index + 1}个逛会场任务完成，开始领取水滴奖励\n`)
                            await browserForTurntableFarm(2, $.initForTurntableFarmRes.turntableBrowserAds[index].adId);
                            if ($.browserForTurntableFarmRes && $.browserForTurntableFarmRes.code === '0') {
                                console.log(`第${index + 1}个逛会场任务领取水滴奖励完成\n`)
                                await initForTurntableFarm();
                                remainLotteryTimes = $.initForTurntableFarmRes.remainLotteryTimes;
                            }
                        }
                    } else {
                        console.log(`浏览天天抽奖的第${index + 1}个逛会场任务已完成`)
                    }
                }
            }
            console.log(`---天天抽奖次数---${remainLotteryTimes}次`)
            //抽奖
            if (remainLotteryTimes > 0) {
                console.log('开始抽奖')
                let lotteryResult = '';
                for (let i = 0; i < new Array(remainLotteryTimes).fill('').length; i++) {
                    await lotteryForTurntableFarm()
                    console.log(`第${i + 1}次抽奖结果${JSON.stringify($.lotteryRes)}`);
                    if ($.lotteryRes && $.lotteryRes.code === '0') {
                        turntableInfos.map((item) => {
                            if (item.type === $.lotteryRes.type) {
                                console.log(`lotteryRes.type${$.lotteryRes.type}`);
                                if ($.lotteryRes.type.match(/bean/g) && $.lotteryRes.type.match(/bean/g)[0] === 'bean') {
                                    lotteryResult += `${item.name}个，`;
                                } else if ($.lotteryRes.type.match(/water/g) && $.lotteryRes.type.match(/water/g)[0] === 'water') {
                                    lotteryResult += `${item.name}，`;
                                } else {
                                    lotteryResult += `${item.name}，`;
                                }
                            }
                        })
                        //没有次数了
                        if ($.lotteryRes.remainLotteryTimes === 0) {
                            break
                        }
                    }
                }
                if (lotteryResult) {
                    console.log(`【天天抽奖】${lotteryResult.substr(0, lotteryResult.length - 1)}\n`)
                    // message += `【天天抽奖】${lotteryResult.substr(0, lotteryResult.length - 1)}\n`;
                }
            } else {
                console.log('天天抽奖-抽奖机会为0次')
            }
        }
        if (flag == 1) {
            //天天抽奖助力
            console.log('\n\n开始天天抽奖-好友助力-每人每天只有三次助力机会\n')
            for (let v of newShareCodes) {
                code = v[1]
                $.theName = v[2]
                if ($.index === v[0]) {
                    console.log('不能助力自己、跳过执行 . . .\n')
                    continue
                }
                // await $.wait(1000)
                await lotteryMasterHelp(code);
                // console.log('天天抽奖助力结果',lotteryMasterHelpRes.helpResult)
                if ($.lotteryMasterHelpRes && $.lotteryMasterHelpRes.helpResult) {
                    if ($.lotteryMasterHelpRes.helpResult.code === '0') {
                        console.log(`助力 [${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName || $.theName}] 成功\n`)
                    } else if ($.lotteryMasterHelpRes.helpResult.code === '11') {
                        console.log(`不要重复助力 [${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName || $.theName}]\n`)
                    } else if ($.lotteryMasterHelpRes.helpResult.code === '13') {
                        console.log(`助力 [${$.lotteryMasterHelpRes.helpResult.masterUserInfo.nickName || $.theName}] 失败, 助力次数耗尽\n`);
                        break;
                    }
                }
            }
        }
    } else {
        console.log('初始化天天抽奖得好礼失败')
    }
}

//领取新版助力奖励
async function getExtraAward() {
    await farmAssistInit();
    if ($.farmAssistResult && $.farmAssistResult.code === "0") {
        if ($.farmAssistResult.assistFriendList && $.farmAssistResult.assistFriendList.length >= 2) {
            if ($.farmAssistResult.status === 2) {
                let num = 0;
                for (let key of Object.keys($.farmAssistResult.assistStageList)) {
                    let vo = $.farmAssistResult.assistStageList[key]
                    if (vo.stageStaus === 2) {
                        await receiveStageEnergy()
                        if ($.receiveStageEnergy && $.receiveStageEnergy.code === "0") {
                            console.log(`已成功领取第${key + 1}阶段好友助力奖励：【${$.receiveStageEnergy.amount}】g水\n`)
                            num += $.receiveStageEnergy.amount
                        }
                    }
                }
                message += `【额外奖励】${num}g水领取成功\n`;
            } else if ($.farmAssistResult.status === 3) {
                console.log("已经领取过8好友助力额外奖励\n");
                message += `【额外奖励】已被领取过\n`;
            }
        } else {
            console.log("助力好友未达到2个\n");
            message += `【额外奖励】领取失败, 给您助力的人未达2个\n`;
        }
        if ($.farmAssistResult.assistFriendList && $.farmAssistResult.assistFriendList.length > 0) {
            let str = '';
            $.farmAssistResult.assistFriendList.map((item, index) => {
                if (index === ($.farmAssistResult.assistFriendList.length - 1)) {
                    str += item.nickName || "匿名用户";
                } else {
                    str += (item.nickName || "匿名用户") + ',';
                }
                let date = new Date(item.time);
                let time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getMinutes();
                console.log(`京东昵称【${item.nickName || "匿名用户"}】 在 ${time} 给您助过力`);
            })
            message += `【助力您的好友】${str}\n`;
        }
        console.log('\n领取助力奖励水滴结束\n');
    } else {
        await masterHelpTaskInitForFarm();
        if ($.masterHelpResult && $.masterHelpResult.code === '0') {
            if ($.masterHelpResult.masterHelpPeoples && $.masterHelpResult.masterHelpPeoples.length >= 5) {
                // 已有五人助力。领取助力后的奖励
                if (!$.masterHelpResult.masterGotFinal) {
                    await masterGotFinishedTaskForFarm();
                    if ($.masterGotFinished && $.masterGotFinished.code === '0') {
                        console.log(`已成功领取好友助力奖励：【${$.masterGotFinished.amount}】g水\n`);
                        message += `【额外奖励】${$.masterGotFinished.amount}g水领取成功\n`;
                    }
                } else {
                    console.log("已经领取过5好友助力额外奖励\n");
                    message += `【额外奖励】已被领取过\n`;
                }
            } else {
                console.log("助力好友未达到5个\n");
                message += `【额外奖励】领取失败, 给您助力的人未达5个\n`;
            }
            if ($.masterHelpResult.masterHelpPeoples && $.masterHelpResult.masterHelpPeoples.length > 0) {
                let str = '';
                $.masterHelpResult.masterHelpPeoples.map((item, index) => {
                    if (index === ($.masterHelpResult.masterHelpPeoples.length - 1)) {
                        str += item.nickName || "匿名用户";
                    } else {
                        str += (item.nickName || "匿名用户") + ',';
                    }
                    let date = new Date(item.time);
                    let time = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getMinutes();
                    console.log(`\n京东昵称【${item.nickName || "匿名用户"}】 在 ${time} 给您助过力\n`);
                })
                message += `【助力您的好友】${str}\n`;
            }
            console.log('\n领取助力奖励水滴结束\n');
        }
    }
}

//助力好友
async function masterHelpShare() {
    console.log('开始助力好友')
    let salveHelpAddWater = 0;
    let remainTimes = 3;//今日剩余助力次数,默认3次（京东农场每人每天3次助力机会）。
    let helpSuccessPeoples = '';//成功助力好友
    console.log(`格式化后的助力码:${JSON.stringify(getCodes(newShareCodes))}\n`);

    for (let v of newShareCodes) {
        code = v[1]
        $.theName = v[2]
        console.log(`开始助力好友: ${code}`);
        if (!code) continue;
        if ($.index === v[0]) {
            console.log('不能助力自己、跳过执行 . . .\n')
            continue
        }
        // await $.wait(1000)
        await masterHelp(code);
        if ($.helpResult && $.helpResult.code === '0') {
            if ($.helpResult.helpResult.code === '0') {
                //助力成功
                salveHelpAddWater += $.helpResult.helpResult.salveHelpAddWater;
                console.log(`【助力好友结果】: 助力【${$.helpResult.helpResult.masterUserInfo.nickName || $.theName}】成功, 获得${$.helpResult.helpResult.salveHelpAddWater}g水滴`);
                helpSuccessPeoples += ($.helpResult.helpResult.masterUserInfo.nickName || $.theName) + ',';
            } else if ($.helpResult.helpResult.code === '8') {
                console.log(`【助力好友结果】: 助力【${$.helpResult.helpResult.masterUserInfo.nickName || $.theName}】失败, 您今天助力次数已耗尽`);
                if (!$.helpRunout.includes($.index)) $.helpRunout.push($.index)
                if ($.HelpOuts.helpOut.indexOf($.UserName) == -1) $.HelpOuts.helpOut.push($.UserName)
            } else if ($.helpResult.helpResult.code === '9') {
                console.log(`【助力好友结果】: 已经给【${$.helpResult.helpResult.masterUserInfo.nickName || $.theName}】助力过了`);
            } else if ($.helpResult.helpResult.code === '10') {
                console.log(`【助力好友结果】: 好友【${$.helpResult.helpResult.masterUserInfo.nickName || $.theName}】助力已满`);
                if (checkArr($.myCodes, code) > -1) $.myCodes.splice(checkArr($.myCodes, code), 1) // 剔除助力已满的助力码
                if (checkArr($.otherCodes, code) > -1) $.otherCodes.splice(checkArr($.otherCodes, code), 1) // 剔除助力已满的助力码
                if ($.HelpOuts.helpFull.indexOf($.theName) == -1) $.HelpOuts.helpFull.push($.theName)
            } else {
                console.log(`助力其他情况: ${JSON.stringify($.helpResult.helpResult)}`);
            }
            console.log(`【今日助力次数还剩】${$.helpResult.helpResult.remainTimes}次\n`);
            remainTimes = $.helpResult.helpResult.remainTimes;
            if ($.helpResult.helpResult.remainTimes === 0) {
                console.log(`您当前助力次数已耗尽，跳出助力`);
                if (!$.helpRunout.includes($.index)) $.helpRunout.push($.index)
                if ($.HelpOuts.helpOut.indexOf($.UserName) == -1) $.HelpOuts.helpOut.push($.UserName)
                break
            }
        } else {
            console.log(`助力失败: ${JSON.stringify($.helpResult)}\n`);
        }
    }
    if ($.isLoon() || $.isQuanX() || $.isSurge()) {
        let helpSuccessPeoplesKey = timeFormat() + $.thisCode;
        if (!$.getdata(helpSuccessPeoplesKey)) {
            //把前一天的清除
            $.setdata('', timeFormat(Date.now() - 24 * 60 * 60 * 1000) + $.thisCode);
            $.setdata('', helpSuccessPeoplesKey);
        }
        if (helpSuccessPeoples) {
            if ($.getdata(helpSuccessPeoplesKey)) {
                $.setdata($.getdata(helpSuccessPeoplesKey) + ',' + helpSuccessPeoples, helpSuccessPeoplesKey);
            } else {
                $.setdata(helpSuccessPeoples, helpSuccessPeoplesKey);
            }
        }
        helpSuccessPeoples = $.getdata(helpSuccessPeoplesKey);
    }
    if (helpSuccessPeoples && helpSuccessPeoples.length > 0) {
        message += `【您助力的好友👬】${helpSuccessPeoples.substr(0, helpSuccessPeoples.length - 1)}\n`;
    }
    if (salveHelpAddWater > 0) {
        // message += `【助力好友👬】获得${salveHelpAddWater}g💧\n`;
        console.log(`【助力好友👬】获得${salveHelpAddWater}g💧\n`);
    }
    message += `【今日剩余助力👬】${remainTimes}次\n`;
    console.log('助力好友结束\n');
}

//水滴雨
async function executeWaterRains() {
    let executeWaterRain = !$.farmTask.waterRainInit.f;
    if (executeWaterRain) {
        console.log(`水滴雨任务，每天两次，最多可得10g水滴`);
        console.log(`两次水滴雨任务是否全部完成：${$.farmTask.waterRainInit.f ? '是' : '否'}`);
        if ($.farmTask.waterRainInit.lastTime) {
            if (Date.now() < ($.farmTask.waterRainInit.lastTime + 3 * 60 * 60 * 1000)) {
                executeWaterRain = false;
                // message += `【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】未到时间，请${new Date($.farmTask.waterRainInit.lastTime + 3 * 60 * 60 * 1000).toLocaleTimeString()}再试\n`;
                console.log(`\`【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】未到时间，请${new Date($.farmTask.waterRainInit.lastTime + 3 * 60 * 60 * 1000).toLocaleTimeString()}再试\n`);
            }
        }
        if (executeWaterRain) {
            console.log(`开始水滴雨任务,这是第${$.farmTask.waterRainInit.winTimes + 1}次，剩余${2 - ($.farmTask.waterRainInit.winTimes + 1)}次`);
            await waterRainForFarm();
            console.log('水滴雨waterRain');
            if ($.waterRain && $.waterRain.code === '0') {
                console.log('水滴雨任务执行成功，获得水滴：' + $.waterRain.addEnergy + 'g');
                console.log(`【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】获得${$.waterRain.addEnergy}g水滴\n`);
                // message += `【第${$.farmTask.waterRainInit.winTimes + 1}次水滴雨】获得${$.waterRain.addEnergy}g水滴\n`;
            }
        }
    } else {
        // message += `【水滴雨】已全部完成，获得20g💧\n`;
    }
}

//打卡领水活动
async function clockInIn() {
    console.log('开始打卡领水活动（签到，关注，领券）');
    await clockInInitForFarm();
    if ($.clockInInit && $.clockInInit.code === '0') {
        // 签到得水滴
        if (!$.clockInInit.todaySigned) {
            console.log('开始今日签到');
            await clockInForFarm();
            console.log(`打卡结果${JSON.stringify($.clockInForFarmRes)}`);
            if ($.clockInForFarmRes && $.clockInForFarmRes.code === '0') {
                // message += `【第${$.clockInForFarmRes.signDay}天签到】获得${$.clockInForFarmRes.amount}g💧\n`;
                console.log(`【第${$.clockInForFarmRes.signDay}天签到】获得${$.clockInForFarmRes.amount}g💧\n`)
                if ($.clockInForFarmRes.signDay === 7) {
                    //可以领取惊喜礼包
                    console.log('开始领取--惊喜礼包38g水滴');
                    await gotClockInGift();
                    if ($.gotClockInGiftRes && $.gotClockInGiftRes.code === '0') {
                        // message += `【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`;
                        console.log(`【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`);
                    }
                }
            }
        }
        if ($.clockInInit.todaySigned && $.clockInInit.totalSigned === 7) {
            console.log('开始领取--惊喜礼包38g水滴');
            await gotClockInGift();
            if ($.gotClockInGiftRes && $.gotClockInGiftRes.code === '0') {
                // message += `【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`;
                console.log(`【惊喜礼包】获得${$.gotClockInGiftRes.amount}g💧\n`);
            }
        }
        // 限时关注得水滴
        if ($.clockInInit.themes && $.clockInInit.themes.length > 0) {
            for (let item of $.clockInInit.themes) {
                if (!item.hadGot) {
                    console.log(`关注ID${item.id}`);
                    await clockInFollowForFarm(item.id, "theme", "1");
                    console.log(`themeStep1--结果${JSON.stringify($.themeStep1)}`);
                    if ($.themeStep1 && $.themeStep1.code === '0') {
                        await clockInFollowForFarm(item.id, "theme", "2");
                        console.log(`themeStep2--结果${JSON.stringify($.themeStep2)}`);
                        if ($.themeStep2 && $.themeStep2.code === '0') {
                            console.log(`关注${item.name}，获得水滴${$.themeStep2.amount}g`);
                        }
                    }
                }
            }
        }
        // 限时领券得水滴
        if ($.clockInInit.venderCoupons && $.clockInInit.venderCoupons.length > 0) {
            for (let item of $.clockInInit.venderCoupons) {
                if (!item.hadGot) {
                    console.log(`领券的ID${item.id}`);
                    await clockInFollowForFarm(item.id, "venderCoupon", "1");
                    console.log(`venderCouponStep1--结果${JSON.stringify($.venderCouponStep1)}`);
                    if ($.venderCouponStep1 && $.venderCouponStep1.code === '0') {
                        await clockInFollowForFarm(item.id, "venderCoupon", "2");
                        if ($.venderCouponStep2 && $.venderCouponStep2.code === '0') {
                            console.log(`venderCouponStep2--结果${JSON.stringify($.venderCouponStep2)}`);
                            console.log(`从${item.name}领券，获得水滴${$.venderCouponStep2.amount}g`);
                        }
                    }
                }
            }
        }
    }
    console.log('开始打卡领水活动（签到，关注，领券）结束\n');
}

//
async function getAwardInviteFriend() {
    await friendListInitForFarm();//查询好友列表
    // console.log(`查询好友列表数据：${JSON.stringify($.friendList)}\n`)
    if ($.friendList) {
        console.log(`今日已邀请好友${$.friendList.inviteFriendCount}个 / 每日邀请上限${$.friendList.inviteFriendMax}个`);
        console.log(`开始删除${$.friendList.friends && $.friendList.friends.length}个好友,可拿每天的邀请奖励`);
        if ($.friendList.friends && $.friendList.friends.length > 0) {
            for (let friend of $.friendList.friends) {
                console.log(`\n开始删除好友 [${friend.shareCode}]`);
                const deleteFriendForFarm = await request('deleteFriendForFarm', { "shareCode": `${friend.shareCode}`, "version": 8, "channel": 1 });
                if (deleteFriendForFarm && deleteFriendForFarm.code === '0') {
                    console.log(`删除好友 [${friend.shareCode}] 成功\n`);
                }
            }
        }
        await receiveFriendInvite();//为他人助力,接受邀请成为别人的好友
        if ($.friendList.inviteFriendCount > 0) {
            if ($.friendList.inviteFriendCount > $.friendList.inviteFriendGotAwardCount) {
                console.log('开始领取邀请好友的奖励');
                await awardInviteFriendForFarm();
                console.log(`领取邀请好友的奖励结果：${JSON.stringify($.awardInviteFriendRes)}`);
            }
        } else {
            console.log('今日未邀请过好友')
        }
    } else {
        console.log(`查询好友列表失败\n`);
    }
}

//给好友浇水
async function doFriendsWater() {
    await friendListInitForFarm();
    console.log('开始给好友浇水...');
    await taskInitForFarm();
    if (!$.farmTask) return
    const { waterFriendCountKey, waterFriendMax } = $.farmTask.waterFriendTaskInit;
    console.log(`今日已给${waterFriendCountKey}个好友浇水`);
    if (waterFriendCountKey < waterFriendMax) {
        let needWaterFriends = [];
        if ($.friendList.friends && $.friendList.friends.length > 0) {
            $.friendList.friends.map((item, index) => {
                if (item.friendState === 1) {
                    if (needWaterFriends.length < (waterFriendMax - waterFriendCountKey)) {
                        needWaterFriends.push(item.shareCode);
                    }
                }
            });
            console.log(`需要浇水的好友列表shareCodes:${JSON.stringify(needWaterFriends)}`);
            let waterFriendsCount = 0, cardInfoStr = '';
            for (let index = 0; index < needWaterFriends.length; index++) {
                await waterFriendForFarm(needWaterFriends[index]);
                console.log(`为第${index + 1}个好友浇水结果:${JSON.stringify($.waterFriendForFarmRes)}\n`)
                if ($.waterFriendForFarmRes && $.waterFriendForFarmRes.code === '0') {
                    waterFriendsCount++;
                    if ($.waterFriendForFarmRes.cardInfo) {
                        console.log('为好友浇水获得道具了');
                        if ($.waterFriendForFarmRes.cardInfo.type === 'beanCard') {
                            console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
                            cardInfoStr += `水滴换豆卡,`;
                        } else if ($.waterFriendForFarmRes.cardInfo.type === 'fastCard') {
                            console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
                            cardInfoStr += `快速浇水卡,`;
                        } else if ($.waterFriendForFarmRes.cardInfo.type === 'doubleCard') {
                            console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
                            cardInfoStr += `水滴翻倍卡,`;
                        } else if ($.waterFriendForFarmRes.cardInfo.type === 'signCard') {
                            console.log(`获取道具卡:${$.waterFriendForFarmRes.cardInfo.rule}`);
                            cardInfoStr += `加签卡,`;
                        }
                    }
                } else if ($.waterFriendForFarmRes && $.waterFriendForFarmRes.code === '11') {
                    console.log('水滴不够,跳出浇水')
                }
            }
            // message += `【好友浇水】已给${waterFriendsCount}个好友浇水,消耗${waterFriendsCount * 10}g水\n`;
            console.log(`【好友浇水】已给${waterFriendsCount}个好友浇水,消耗${waterFriendsCount * 10}g水\n`);
            if (cardInfoStr && cardInfoStr.length > 0) {
                // message += `【好友浇水奖励】${cardInfoStr.substr(0, cardInfoStr.length - 1)}\n`;
                console.log(`【好友浇水奖励】${cardInfoStr.substr(0, cardInfoStr.length - 1)}\n`);
            }
        } else {
            console.log('您的好友列表暂无好友,快去邀请您的好友吧!')
        }
    } else {
        console.log(`今日已为好友浇水量已达${waterFriendMax}个`)
    }
}

//领取给3个好友浇水后的奖励水滴
async function getWaterFriendGotAward() {
    await taskInitForFarm();
    if ($.farmTask?.waterFriendTaskInit) {
        const { waterFriendCountKey, waterFriendMax, waterFriendSendWater, waterFriendGotAward } = $.farmTask.waterFriendTaskInit
        if (waterFriendCountKey >= waterFriendMax) {
            if (!waterFriendGotAward) {
                await waterFriendGotAwardForFarm();
                console.log(`领取给${waterFriendMax}个好友浇水后的奖励水滴::${JSON.stringify($.waterFriendGotAwardRes)}`)
                if ($.waterFriendGotAwardRes && $.waterFriendGotAwardRes.code === '0') {
                    // message += `【给${waterFriendMax}好友浇水】奖励${$.waterFriendGotAwardRes.addWater}g水滴\n`;
                    console.log(`【给${waterFriendMax}好友浇水】奖励${$.waterFriendGotAwardRes.addWater}g水滴\n`);
                }
            } else {
                console.log(`给好友浇水的${waterFriendSendWater}g水滴奖励已领取\n`);
                // message += `【给${waterFriendMax}好友浇水】奖励${waterFriendSendWater}g水滴已领取\n`;
            }
        } else {
            console.log(`暂未给${waterFriendMax}个好友浇水\n`);
        }
    }
}

//接收成为对方好友的邀请
async function receiveFriendInvite() {
    // console.log(newShareCodes)
    for (let v of newShareCodes) {
        code = v[1]
        $.theName = v[2]
        if ($.index === v[0]) {
            console.log('不能邀请自己成为好友、跳过执行 . . .')
            continue
        }
        await inviteFriend(code);
        // console.log(`接收邀请成为好友结果:${JSON.stringify($.inviteFriendRes)}`)
        if ($.inviteFriendRes && $.inviteFriendRes.helpResult && $.inviteFriendRes.helpResult.code === '0') {
            console.log(`接收邀请成为好友结果成功,您已成为${$.inviteFriendRes.helpResult.masterUserInfo.nickName || $.theName}的好友`)
        } else if ($.inviteFriendRes && $.inviteFriendRes.helpResult && $.inviteFriendRes.helpResult.code === '17') {
            console.log(`接收邀请成为好友结果失败,对方已是您的好友`)
        }
    }
}

async function duck() {
    for (let i = 0; i < 10; i++) {
        //这里循环十次
        await getFullCollectionReward();
        if ($.duckRes && $.duckRes.code === '0') {
            if (!$.duckRes.hasLimit) {
                console.log(`小鸭子游戏:${$.duckRes.title}`);
                // if ($.duckRes.type !== 3) {
                //   console.log(`${$.duckRes.title}`);
                //   if ($.duckRes.type === 1) {
                //     message += `【小鸭子】为你带回了水滴\n`;
                //   } else if ($.duckRes.type === 2) {
                //     message += `【小鸭子】为你带回快速浇水卡\n`
                //   }
                // }
            } else {
                console.log(`${$.duckRes.title}`)
                break;
            }
        } else if ($.duckRes && $.duckRes.code === '10') {
            console.log(`小鸭子游戏达到上限`)
            break;
        }
    }
}

// ========================API调用接口========================
//鸭子，点我有惊喜
async function getFullCollectionReward() {
    return new Promise(async resolve => {
        const body = { "type": 2, "version": 6, "channel": 2 };
        $.post(await taskUrl("getFullCollectionReward", body), (err, resp, data) => {
            try {
                if (err) {
                    console.log('\ngetFullCollectionReward: API查询请求失败 ‼️‼️');
                    console.log(JSON.stringify(err));
                    // $.logErr(err);
                } else {
                    if (safeGet(data)) {
                        $.duckRes = JSON.parse(data);
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}

/**
 * 领取10次浇水奖励API
 */
async function totalWaterTaskForFarm() {
    const functionId = arguments.callee.name.toString();
    $.totalWaterReward = await request(functionId);
}

//领取首次浇水奖励API
async function firstWaterTaskForFarm() {
    const functionId = arguments.callee.name.toString();
    $.firstWaterReward = await request(functionId);
}

//领取给3个好友浇水后的奖励水滴API
async function waterFriendGotAwardForFarm() {
    const functionId = arguments.callee.name.toString();
    $.waterFriendGotAwardRes = await request(functionId, { "version": 4, "channel": 1 });
}

// 查询背包道具卡API
async function myCardInfoForFarm() {
    const functionId = arguments.callee.name.toString();
    $.myCardInfoRes = await request(functionId, { "version": 5, "channel": 1 });
}

//使用道具卡API
async function userMyCardForFarm(cardType) {
    const functionId = arguments.callee.name.toString();
    $.userMyCardRes = await request(functionId, { "cardType": cardType });
}

/**
 * 领取浇水过程中的阶段性奖励
 * @param type
 * @returns {Promise<void>}
 */
async function gotStageAwardForFarm(type) {
    $.gotStageAwardForFarmRes = await request(arguments.callee.name.toString(), { 'type': type });
}

//浇水API
async function waterGoodForFarm() {
    await $.wait(1000);
    console.log('等待了1秒');

    const functionId = arguments.callee.name.toString();
    $.waterResult = await request(functionId);
}

// 初始化集卡抽奖活动数据API
async function initForTurntableFarm() {
    $.initForTurntableFarmRes = await request(arguments.callee.name.toString(), { version: 4, channel: 1 });
}

async function lotteryForTurntableFarm() {
    await $.wait(2000);
    console.log('等待了2秒');
    $.lotteryRes = await request(arguments.callee.name.toString(), { type: 1, version: 4, channel: 1 });
}

async function timingAwardForTurntableFarm() {
    $.timingAwardRes = await request(arguments.callee.name.toString(), { version: 4, channel: 1 });
}

async function browserForTurntableFarm(type, adId) {
    if (type === 1) {
        console.log('浏览爆品会场');
    }
    if (type === 2) {
        console.log('天天抽奖浏览任务领取水滴');
    }
    const body = { "type": type, "adId": adId, "version": 4, "channel": 1 };
    $.browserForTurntableFarmRes = await request(arguments.callee.name.toString(), body);
    // 浏览爆品会场8秒
}

//天天抽奖浏览任务领取水滴API
async function browserForTurntableFarm2(type) {
    const body = { "type": 2, "adId": type, "version": 4, "channel": 1 };
    $.browserForTurntableFarm2Res = await request('browserForTurntableFarm', body);
}

/**
 * 天天抽奖拿好礼-助力API(每人每天三次助力机会)
 */
async function lotteryMasterHelp() {
    $.lotteryMasterHelpRes = await request(`initForFarm`, {
        imageUrl: "",
        nickName: "",
        shareCode: arguments[0] + '-3',
        babelChannel: "3",
        version: 4,
        channel: 1
    });
}

//领取5人助力后的额外奖励API
async function masterGotFinishedTaskForFarm() {
    const functionId = arguments.callee.name.toString();
    $.masterGotFinished = await request(functionId);
}

//助力好友信息API
async function masterHelpTaskInitForFarm() {
    const functionId = arguments.callee.name.toString();
    $.masterHelpResult = await request(functionId);
}

//新版助力好友信息API
async function farmAssistInit() {
    const functionId = arguments.callee.name.toString();
    $.farmAssistResult = await request(functionId, { "version": 14, "channel": 1, "babelChannel": "120" });
}

//新版领取助力奖励API
async function receiveStageEnergy() {
    const functionId = arguments.callee.name.toString();
    $.receiveStageEnergy = await request(functionId, { "version": 14, "channel": 1, "babelChannel": "120" });
}

//接受对方邀请,成为对方好友的API
async function inviteFriend() {
    $.inviteFriendRes = await request(`initForFarm`, {
        imageUrl: "",
        nickName: "",
        shareCode: arguments[0] + '-inviteFriend',
        version: 4,
        channel: 2
    });
}

// 助力好友API
async function masterHelp() {
    $.helpResult = await request(`initForFarm`, {
        imageUrl: "",
        nickName: "",
        shareCode: arguments[0],
        babelChannel: "3",
        version: 2,
        channel: 1
    });
}

/**
 * 水滴雨API
 */
async function waterRainForFarm() {
    const functionId = arguments.callee.name.toString();
    const body = { "type": 1, "hongBaoTimes": 100, "version": 3 };
    $.waterRain = await request(functionId, body);
}

/**
 * 打卡领水API
 */
async function clockInInitForFarm() {
    const functionId = arguments.callee.name.toString();
    $.clockInInit = await request(functionId);
}

// 连续签到API
async function clockInForFarm() {
    const functionId = arguments.callee.name.toString();
    $.clockInForFarmRes = await request(functionId, { "type": 1 });
}

//关注，领券等API
async function clockInFollowForFarm(id, type, step) {
    const functionId = arguments.callee.name.toString();
    let body = {
        id,
        type,
        step
    }
    if (type === 'theme') {
        if (step === '1') {
            $.themeStep1 = await request(functionId, body);
        } else if (step === '2') {
            $.themeStep2 = await request(functionId, body);
        }
    } else if (type === 'venderCoupon') {
        if (step === '1') {
            $.venderCouponStep1 = await request(functionId, body);
        } else if (step === '2') {
            $.venderCouponStep2 = await request(functionId, body);
        }
    }
}

// 领取连续签到7天的惊喜礼包API
async function gotClockInGift() {
    $.gotClockInGiftRes = await request('clockInForFarm', { "type": 2 })
}

//定时领水API
async function gotThreeMealForFarm() {
    const functionId = arguments.callee.name.toString();
    $.threeMeal = await request(functionId);
}

/**
 * 浏览广告任务API
 * type为0时, 完成浏览任务
 * type为1时, 领取浏览任务奖励
 */
async function browseAdTaskForFarm(advertId, type) {
    const functionId = arguments.callee.name.toString();
    if (type === 0) {
        $.browseResult = await request(functionId, { advertId, type, "version": 14, "channel": 1, "babelChannel": "45" });
    } else if (type === 1) {
        $.browseRwardResult = await request(functionId, { advertId, type, "version": 14, "channel": 1, "babelChannel": "45" });
    }
}

// 被水滴砸中API
async function gotWaterGoalTaskForFarm() {
    $.goalResult = await request(arguments.callee.name.toString(), { type: 3 });
}

//签到API
async function signForFarm() {
    const functionId = arguments.callee.name.toString();
    $.signResult = await request(functionId);
}

/**
 * 初始化农场, 可获取果树及用户信息API
 */
async function initForFarm() {
    let body = {}
    return new Promise(async resolve => {
        $.get(await taskUrl("initForFarm", body), (err, resp, data) => {
            try {
                if (err) {
                    console.log('\ninitForFarm: API查询请求失败 ‼️‼️');
                    console.log(JSON.stringify(err));
                    // $.logErr(err);
                } else {
                    if (safeGet(data)) {
                        $.farmInfo = JSON.parse(data)
                        if ($.farmInfo.message) console.log($.farmInfo.message)
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}
async function isNewVersion() {
    let body = {}
    return new Promise(async resolve => {
        const options = {
            url: "https://mapi.m.jd.com/config/display.action?isNewVersion=1&_format_=json&busUrl=https://h5.m.jd.com/babelDiy/Zeus/3KSjXqQabiTuD1cJ28QskrpWoBKT/index.html",
            headers: {
                "Accept": "*/*",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                "Cookie": cookie,
                "User-Agent": $.UA,
                "origin": "https://h5.m.jd.com",
                "Referer": "https://h5.m.jd.com/",
                "Accept-Encoding": "gzip, deflate, br"
            }
        }
        $.post(options, (err, resp, data) => {
            try {
                if (err) {
                    console.log('\nisNewVersion: API查询请求失败 ‼️‼️');
                    console.log(JSON.stringify(err));
                    // $.logErr(err);
                } else {
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve();
            }
        })
    })
}

// 初始化任务列表API
async function taskInitForFarm() {
    console.log('\n初始化任务列表')
    const functionId = arguments.callee.name.toString();
    $.farmTask = await request(functionId, { "version": 14, "channel": 1, "babelChannel": "45" });
}

//获取好友列表API
async function friendListInitForFarm() {
    $.friendList = await request('friendListInitForFarm', { "version": 4, "channel": 1 });
    // console.log('aa', aa);
}

// 领取邀请好友的奖励API
async function awardInviteFriendForFarm() {
    $.awardInviteFriendRes = await request('awardInviteFriendForFarm');
}

//为好友浇水API
async function waterFriendForFarm(shareCode) {
    const body = { "shareCode": shareCode, "version": 6, "channel": 1 }
    $.waterFriendForFarmRes = await request('waterFriendForFarm', body);
}

async function showMsg() {
    if ($.isNode() && process.env.FRUIT_NOTIFY_CONTROL) {
        $.ctrTemp = `${process.env.FRUIT_NOTIFY_CONTROL}` === 'false';
    } else if ($.getdata('jdFruitNotify')) {
        $.ctrTemp = $.getdata('jdFruitNotify') === 'false';
    } else {
        $.ctrTemp = `${jdNotify}` === 'false';
    }
    if ($.ctrTemp) {
        $.msg($.name, subTitle, message, option);
        if ($.isNode()) {
            allMessage += `${subTitle}\n${message}${$.index !== cookiesArr.length ? '\n\n' : ''}`;
            // await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `${subTitle}\n${message}`);
        }
    } else {
        $.log(`\n${message}\n`);
    }
}

function timeFormat(time) {
    let date;
    if (time) {
        date = new Date(time)
    } else {
        date = new Date();
    }
    return date.getFullYear() + '-' + ((date.getMonth() + 1) >= 10 ? (date.getMonth() + 1) : '0' + (date.getMonth() + 1)) + '-' + (date.getDate() >= 10 ? date.getDate() : '0' + date.getDate());
}

function shareCodesFormat() {
    return new Promise(async resolve => {
        newShareCodes = [];
        if ($.myCodes.length > 0) for (let i of $.myCodes) newShareCodes.push(i)
        if (helpRandom + "" === "true") $.otherCodes = randomArr($.otherCodes) // 随机排序
        if ($.otherCodes.length > 0) for (let j of $.otherCodes) newShareCodes.push(j)
        resolve();
    })
}

function requireConfig() {
    return new Promise(resolve => {
        // console.log('开始获取配置文件\n')
        notify = $.isNode() ? require('./sendNotify') : '';
        //Node.js用户请在jdCookie.js处填写京东ck;
        const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
        //IOS等用户直接用NobyDa的jd cookie
        if ($.isNode()) {
            Object.keys(jdCookieNode).forEach((item) => {
                if (jdCookieNode[item]) {
                    cookiesArr.push(jdCookieNode[item])
                }
            })
            if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
        } else {
            cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
        }
        console.log(`共${cookiesArr.length}个京东账号\n\n============================================================`)
        console.log(`你的互助配置如下：\n互助模式：${helpRandom + "" === "true" ? '随机互助' : '顺序互助'}\n优先被助力账号：${$.myFronts.length > 0 ? $.myFronts.toString() : '未设定'}   \n不执行浇水账号：${$.notDoWaters.length > 0 ? $.notDoWaters.toString() : '未设定'}`);
        console.log(`自动化收取种植：${$.farmAutoFlag == true ? `自动` : '不自动'}`);
        console.log(`\n环境变量设置提示：\nexport jd_helpFronts="1,2,3-5" 表示账号12345固定优先被助力\nexport jd_helpRandom="true" 表示固定助力过后全部随机助力、反之顺序助力\nexport jd_notWaterUsers="111&222&333" 表示账号(pin & 隔开) 111、222、333，只做任务、不浇水`);
        console.log(`export farmAutoFlag="true" 表示开启自动种植、false或不填则不开启`);
        console.log(`\n脚本先执行日常任务，最后再执行内部互助\n助力码直接脚本获取，解决助力码过长问题\n助力已满和耗尽的号，会缓存至本地以过滤`);
        console.log(`============================================================`)
        resolve()
    })
}

function TotalBean() {
    return new Promise(async resolve => {
        const options = {
            url: "https://me-api.jd.com/user_new/info/GetJDUserInfoUnion",
            headers: {
                Host: "me-api.jd.com",
                Accept: "*/*",
                Connection: "keep-alive",
                Cookie: cookie,
                "User-Agent": $.UA,
                "Accept-Language": "zh-cn",
                "Referer": "https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&",
                "Accept-Encoding": "gzip, deflate, br"
            }
        }
        $.get(options, (err, resp, data) => {
            try {
                if (err) {
                    console.log(`TotalBean 请求失败 ${$.toStr(err)}`)
                } else {
                    let res = $.toObj(data, data)
                    if (typeof res == 'object') {
                        if (res.retcode === "1001") {
                            $.isLogin = false; //cookie过期
                            return;
                        } else if (res.retcode === "0" && res.data && res.data.hasOwnProperty("userInfo")) {
                            $.nickName = res.data.userInfo.baseInfo.nickname
                        } else {

                        }
                    } else {
                        console.log(`TotalBean 京东服务器返回空数据`)
                    }
                }
            } catch (e) {
                $.logErr(e)
            } finally {
                resolve();
            }
        })
    })
}

function request(function_id, body = {}, timeout = 1000) {
    return new Promise(async resolve => {
        const option = await taskUrl(function_id, body)
        setTimeout(() => {
            $.get(option, (err, resp, data) => {
                try {
                    if (err) {
                        console.log(`${function_id}: API查询请求失败 ‼️‼️`)
                        console.log(JSON.stringify(err));
                        // $.logErr(err);
                    } else {
                        if (safeGet(data)) {
                            data = JSON.parse(data);
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve(data);
                }
            })
        }, timeout)
    })
}

function safeGet(data) {
    try {
        if (typeof JSON.parse(data) == "object") {
            return true;
        }
    } catch (e) {
        console.log(e);
        console.log(`京东服务器访问数据为空，请检查自身设备网络情况`);
        return false;
    }
}

async function taskUrl(function_id, body = {}) {
    let h5st = ''
    let body_in = { "version": 18, "channel": 1, "babelChannel": 0 }
    body_in = { ...body, ...body_in }
    let h5st_body = {
        appid: 'signed_wh5',
        body: JSON.stringify(body_in),
        client: /ip(hone|od)|ipad/i.test($.UA) ? 'apple' : "android",
        clientVersion: $.UA.split(';')[2],
        functionId: function_id
    }
    if (h5stTool[function_id]) {
        let tools = 'h5stTool_' + h5stTool[function_id]
        if (!$[tools]) {
            let fp = ''
            $[tools] = new H5ST(h5stTool[function_id], $.UA, fp)
            await $[tools].__genAlgo()
        }
        h5st = $[tools].__genH5st(h5st_body)
    } else {
        h5st_body.appid = "wh5"
    }
    const options = {
        url: `${JD_API_HOST}?functionId=${function_id}&body=${(JSON.stringify(body_in))}&appid=${h5st_body.appid}&area=0_0_0_0&osVersion=&screen=414*896&networkType=&timestamp=${Date.now() - 5}&d_brand=&d_model=&wqDefault=false&client=${h5st_body.client}&clientVersion=${h5st_body.clientVersion}&partner=&build=&openudid=${h5st ? "&h5st=" + h5st : ""}`,
        headers: {
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "zh-CN,zh;q=0.9",
            "Cookie": cookie,
            "Origin": "https://h5.m.jd.com",
            "Referer": "https://h5.m.jd.com/",
            "User-Agent": $.UA
        },
        timeout: 10000,
    }
    if (function_id == "getEncryptedPinColor") {
        options.url = `${JD_API_HOST}?functionId=${function_id}&body=${(JSON.stringify(body_in))}&appid=${h5st_body.appid}`
    }
    // console.log(options.url)
    if (["taskInitForFarm", "initForFarm"].includes(function_id)) {
        options.headers.Cookie = `__jd_ref_cls=Babel_dev_other_DDNC_exposure;${options.headers.Cookie}`
    }
    options.headers.Cookie = options.headers.Cookie.replace(/;\s*$/, '')
    options.headers.Cookie = options.headers.Cookie.replace(/;([^\s])/g, '; $1')
    return options
}

function jsonParse(str) {
    if (typeof str == "string") {
        try {
            return JSON.parse(str);
        } catch (e) {
            console.log(e);
            $.msg($.name, '', '请勿随意在BoxJs输入框修改内容\n建议通过脚本去获取cookie')
            return [];
        }
    }
}

async function getCodesCache() {
    if (thefs.existsSync(outpath)) $.Helptext = thefs.readFileSync(outpath, 'utf-8')
    if ($.Helptext) $.helpJson = JSON.parse($.Helptext)
    if (JSON.stringify($.helpJson) != "{}" && $.helpJson.thisDay && $.helpJson.thisDay == $.HelpOuts.thisDay) {
        if ($.helpJson.helpOut && $.helpJson.helpOut.length) for (let n of $.helpJson.helpOut) if ($.HelpOuts.helpOut.indexOf(n) == -1) $.HelpOuts.helpOut.push(n)
        if ($.helpJson.helpFull && $.helpJson.helpFull.length) for (let m of $.helpJson.helpFull) if ($.HelpOuts.helpFull.indexOf(m) == -1) $.HelpOuts.helpFull.push(m)
    }
    $.helpOut = $.HelpOuts.helpOut
    $.helpFull = $.HelpOuts.helpFull
    if ($.helpFull.length) {
        for (let t of $.helpFull) {
            if (checkArr($.myCodes, t) > -1) $.myCodes.splice(checkArr($.myCodes, t), 1) // 剔除助力已满的助力码
            if (checkArr($.otherCodes, t) > -1) $.otherCodes.splice(checkArr($.otherCodes, t), 1) // 剔除助力已满的助力码
        }
    }
}

function getUA() {
    $.UA = `jdapp;iPhone;11.3.2;;;M/5.0;appBuild/168346;jdSupportDarkMode/0;ef/1;ep/${encodeURIComponent(JSON.stringify({ "ciphertype": 5, "cipher": { "ud": "", "sv": "CJGkCm==", "iad": "" }, "ts": 1668355995, "hdid": "JM9F1ywUPwflvMIpYPok0tt5k9kW4ArJEU3lfLhxBqw=", "version": "1.0.3", "appname": "com.360buy.jdmobile", "ridx": -1 }))};Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1;`
}
function generateArr(start, end) {
    return Array.from(new Array(end + 1).keys()).slice(start)
}

// 获取下标 和 判断是否存在
function checkArr(arr, val) {
    for (let p = 0; p < arr.length; p++) {
        if (arr[p][0] == val || arr[p][1] == val || arr[p][2] == val) {
            return p
        }
    }
    return -1
}

// 读取助力码
function getCodes(arr) {
    let codeStr = []
    for (let p of arr) codeStr.push(p[1])
    // codeStr = codeStr.toString()
    return codeStr
}

// 数组均衡随机排序
function randomArr(arr) {
    let i = arr.length;
    while (i) {
        let j = Math.floor(Math.random() * i--);
        [arr[j], arr[i]] = [arr[i], arr[j]];
    }
    return arr
}

var _0xodi = 'jsjiami.com.v6', _0xodi_ = ['‮_0xodi'], _0x1dd7 = [_0xodi, 'wrc5WA==', 'McOMwp4c', 'AmzCsxBg', 'w7vDqBhVWw==', 'wpHDi8KEER0+THc=', 'w67DtztoTcOzEwI=', 'Uz/DgsKAIQ==', 'Vz17wo/CuUs=', 'w5NLwrQnwpQ=', 'w59wNsOyK1I=', 'FMOBTAHCiQ==', 'NcKNCzVmHA==', 'wpnDpMOFAMKofsO3wpgbWcKgJgM8', 'w7XCiCAkw490', 'w5vDtATDpMOfw5I=', 'woTDiMKnDQ41R2Q=', 'w7Bhw5A=', 'JSQ1Jw==', 'an/Cnht2woDCn8O/', 'OsKdFiZ9GUIwGRY=', 'w4bDtyLDhsO/', 'w7pkw44ZwoU=', 'w7XDjEVBc8O6AzzDtMOxcAsgGcOVTsOJwrUTbwEMw6/CqCjDiRICw7osMcKfwo7CkjZKwpw/PMOow6FDZMODw77DggTCjcOBF3Zy', 'a8KSw4VBwoNRwpDCscKiX8OKwpEkwq/CpHTDl09dcX/Ci8Kvw5VwXMO+wrtpOSLCnMKJWcOnw4TCm3ZKw5DCksKbLMKzw7g8w4hiw4QEdMK5w50fGWAvWcOXasOpw7nDtAI=', 'wpjCsUTCvsKFwoDDscKZwrwb', 'wqPDiMKbIQc=', 'bcKKwp7DosK2FMK7ZAZgwqbCvsOwElMTHcKXwq7CmSTDjxMxwrITwqjClDF3w6HCpcKWS2LDqznCucKZw4QLa8OSbA==', 'w4N6K8Oh', 'B8O7bDXCmA==', 'H8KBwrw=', 'OsKJBiZnBygzHkwnwoLCpg==', 'RcKGwpMcwqkfwpfDhhMaQyFySMKZwrjDgg==', 'w6FlAsOzMw==', 'XUk6SA==', 'RcKZwpQnw6BG', 'wohxLMOswqrCuhc=', 'w6ZmwqYI', 'MsOEbzzDmhI=', 'UCvDk8Ku', 'w4XDhw95UcORGBw=', 'wr5sZw==', 'fxrClMOp', 'w4BawoXDrMOH', 'w4XCrMKTJMKe', 'wrQmVBnCi8Kj', 'YsKmw5YKW8Obw63Crw==', 'wp/DscOBG8Kt', 'UTNGwp/CpE/DucOU', 'w7HDvRFv', 'ImrDrA==', 'JsKtPwHCoA==', 'Qn55w6VN', 'P3XCtDdo', 'ccK0wrtewrAJ', 'MlZdWTzCuizDng==', 'w4ARw7s=', 'wpNnfA==', 'w5zDg0dGRcOUJWbCqMKt', 'KcKRL8K0BsOlwqIP', 'OMKYFRt2', 'ennCrhtQwpDCgcO9', 'w4XCs8K6dMOi', 'UUnCmgpMwr/Cnw==', 'wq5VVsKNwoAQw6k=', 'b8OuUnrCi15zw7RAGA==', 'w7PCncK3AcKY', 'UsKrw5c0w6Vd', 'KsKEDDF3', 'w6nCmD0qw4tlwqU=', 'T25iw7rCsw==', 'KWfDlMO3Wg==', 'RsKmw7EWw5I=', 'bRfCksOEwqQ=', 'wpnCgsKYw6FgW0bCpMKwL8KXSC1B', 'VMKGw7QUbw==', 'PcO9w5thwp/CucOzw5jDq8KyIMOkNhh4wqLClw==', 'G0DDlMOwcQ==', 'fF50w5RsCQ==', 'eMOMe8Ohw5o=', 'eMOUfsOuw5o=', 'w60ow4vCuMK1', 'DMO7TTHDhA==', 'PsKRKsKHGw==', 'B1rDscO5Wg==', 'exrCig==', 'RSjDp8K1H1zDh2g=', 'cAPDqzHDnQ==', 'BcKBwpgWGMOxN00=', 'w77CrMKNOQ==', 'HMKPwrs=', 'wohKRcKoGh4=', 'wqcsaSbCnMKzwqbCmg==', 'DjzsPhztWXGpjZppiamGi.com.v6==']; if (function (_0x2738ad, _0x34e335, _0x3d7ffe) { function _0x22f49e(_0x16f19e, _0x29f154, _0x597415, _0x1c755c, _0x5b35f7, _0x4d9ae2) { _0x29f154 = _0x29f154 >> 0x8, _0x5b35f7 = 'po'; var _0x2d4dc2 = 'shift', _0x50b1ec = 'push', _0x4d9ae2 = '‮'; if (_0x29f154 < _0x16f19e) { while (--_0x16f19e) { _0x1c755c = _0x2738ad[_0x2d4dc2](); if (_0x29f154 === _0x16f19e && _0x4d9ae2 === '‮' && _0x4d9ae2['length'] === 0x1) { _0x29f154 = _0x1c755c, _0x597415 = _0x2738ad[_0x5b35f7 + 'p'](); } else if (_0x29f154 && _0x597415['replace'](/[DzPhztWXGpZppG=]/g, '') === _0x29f154) { _0x2738ad[_0x50b1ec](_0x1c755c); } } _0x2738ad[_0x50b1ec](_0x2738ad[_0x2d4dc2]()); } return 0x112c98; }; return _0x22f49e(++_0x34e335, _0x3d7ffe) >> _0x34e335 ^ _0x3d7ffe; }(_0x1dd7, 0x99, 0x9900), _0x1dd7) { _0xodi_ = _0x1dd7['length'] ^ 0x99; }; function _0x5415(_0x425333, _0x120953) { _0x425333 = ~~'0x'['concat'](_0x425333['slice'](0x1)); var _0x357481 = _0x1dd7[_0x425333]; if (_0x5415['SAljyQ'] === undefined) { (function () { var _0x2935c2 = typeof window !== 'undefined' ? window : typeof process === 'object' && typeof require === 'function' && typeof global === 'object' ? global : this; var _0x194dd7 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='; _0x2935c2['atob'] || (_0x2935c2['atob'] = function (_0x519d2f) { var _0x1fe3d7 = String(_0x519d2f)['replace'](/=+$/, ''); for (var _0x25fa48 = 0x0, _0x26a2e9, _0x22659c, _0x4ad9be = 0x0, _0x50bec6 = ''; _0x22659c = _0x1fe3d7['charAt'](_0x4ad9be++); ~_0x22659c && (_0x26a2e9 = _0x25fa48 % 0x4 ? _0x26a2e9 * 0x40 + _0x22659c : _0x22659c, _0x25fa48++ % 0x4) ? _0x50bec6 += String['fromCharCode'](0xff & _0x26a2e9 >> (-0x2 * _0x25fa48 & 0x6)) : 0x0) { _0x22659c = _0x194dd7['indexOf'](_0x22659c); } return _0x50bec6; }); }()); function _0x365447(_0x43bf46, _0x120953) { var _0x9c1b0b = [], _0x2619e1 = 0x0, _0x46554e, _0x5200b6 = '', _0x280571 = ''; _0x43bf46 = atob(_0x43bf46); for (var _0x22e76b = 0x0, _0x41e5cf = _0x43bf46['length']; _0x22e76b < _0x41e5cf; _0x22e76b++) { _0x280571 += '%' + ('00' + _0x43bf46['charCodeAt'](_0x22e76b)['toString'](0x10))['slice'](-0x2); } _0x43bf46 = decodeURIComponent(_0x280571); for (var _0x499a3a = 0x0; _0x499a3a < 0x100; _0x499a3a++) { _0x9c1b0b[_0x499a3a] = _0x499a3a; } for (_0x499a3a = 0x0; _0x499a3a < 0x100; _0x499a3a++) { _0x2619e1 = (_0x2619e1 + _0x9c1b0b[_0x499a3a] + _0x120953['charCodeAt'](_0x499a3a % _0x120953['length'])) % 0x100; _0x46554e = _0x9c1b0b[_0x499a3a]; _0x9c1b0b[_0x499a3a] = _0x9c1b0b[_0x2619e1]; _0x9c1b0b[_0x2619e1] = _0x46554e; } _0x499a3a = 0x0; _0x2619e1 = 0x0; for (var _0x397314 = 0x0; _0x397314 < _0x43bf46['length']; _0x397314++) { _0x499a3a = (_0x499a3a + 0x1) % 0x100; _0x2619e1 = (_0x2619e1 + _0x9c1b0b[_0x499a3a]) % 0x100; _0x46554e = _0x9c1b0b[_0x499a3a]; _0x9c1b0b[_0x499a3a] = _0x9c1b0b[_0x2619e1]; _0x9c1b0b[_0x2619e1] = _0x46554e; _0x5200b6 += String['fromCharCode'](_0x43bf46['charCodeAt'](_0x397314) ^ _0x9c1b0b[(_0x9c1b0b[_0x499a3a] + _0x9c1b0b[_0x2619e1]) % 0x100]); } return _0x5200b6; } _0x5415['efINBg'] = _0x365447; _0x5415['EoCvAL'] = {}; _0x5415['SAljyQ'] = !![]; } var _0x1e87e9 = _0x5415['EoCvAL'][_0x425333]; if (_0x1e87e9 === undefined) { if (_0x5415['zZZeNk'] === undefined) { _0x5415['zZZeNk'] = !![]; } _0x357481 = _0x5415['efINBg'](_0x357481, _0x120953); _0x5415['EoCvAL'][_0x425333] = _0x357481; } else { _0x357481 = _0x1e87e9; } return _0x357481; }; class H5ST { constructor(_0x48f34d = '', _0x1f4a01 = '', _0x2447f1 = '') { this[_0x5415('‮0', 'Bf^g')] = _0x48f34d; this['ua'] = _0x1f4a01; this['fp'] = _0x2447f1 || this[_0x5415('‫1', 'fH]E')](); } [_0x5415('‮2', '(DEe')]() { var _0x440078 = { 'fTCKh': function (_0x50a3ab, _0x1123eb) { return _0x50a3ab | _0x1123eb; }, 'RrnHn': function (_0x250745, _0x36889a) { return _0x250745 + _0x36889a; }, 'SDJmv': function (_0x5bec62, _0x4f3575) { return _0x5bec62 + _0x4f3575; }, 'flHFX': function (_0x39ff09, _0xec24ba) { return _0x39ff09 + _0xec24ba; }, 'xboCm': function (_0x5af6b8, _0x64a52e) { return _0x5af6b8 + _0x64a52e; }, 'jUoxX': function (_0x128352, _0x133e21) { return _0x128352 - _0x133e21; }, 'BOqjF': function (_0x15e24d, _0x1195a8) { return _0x15e24d + _0x1195a8; } }; var _0x3389af = _0x5415('‫3', 'siMd'), _0x280ba1 = '', _0x223c6c = _0x3389af, _0x46bf51 = _0x440078[_0x5415('‮4', 'sE9A')](Math[_0x5415('‫5', 'X0s2')]() * 0xa, 0x0); _0x280ba1 = this['Yh'](_0x3389af, 0x3); for (let _0x202ec1 of _0x280ba1[_0x5415('‮6', '08)C')]()) _0x223c6c = _0x223c6c[_0x5415('‫7', '2huC')](_0x202ec1, ''); return _0x440078[_0x5415('‮8', 'e^2[')](_0x440078['SDJmv'](_0x440078[_0x5415('‮9', '%mwc')](_0x440078[_0x5415('‮a', 'X0s2')](_0x440078[_0x5415('‫b', 'EG04')](this['getRandomIDPro']({ 'size': _0x46bf51, 'customDict': _0x223c6c }), ''), _0x280ba1), this[_0x5415('‮c', 'azhg')]({ 'size': _0x440078['jUoxX'](0xe, _0x440078[_0x5415('‫d', '@7(B')](_0x46bf51, 0x3)) + 0x1, 'customDict': _0x223c6c })), _0x46bf51), ''); } ['Yh'](_0x2fa474, _0x4b9a8d) { var _0x397acc = { 'HQmHX': function (_0x3a4787, _0x57def2) { return _0x3a4787 + _0x57def2; }, 'VeKRJ': _0x5415('‫e', 'u]Y9'), 'pJnRL': function (_0x3a1e90, _0x225a05) { return _0x3a1e90(_0x225a05); }, 'xjElI': function (_0x370d93, _0x1d10e3) { return _0x370d93 * _0x1d10e3; }, 'HWSFP': function (_0x5352b5, _0x448cd8) { return _0x5352b5 == _0x448cd8; }, 'LZQxr': function (_0xe95c5, _0x565984) { return _0xe95c5 < _0x565984; }, 'coVGo': 'kfneU', 'dBfoL': _0x5415('‫f', '%mwc'), 'bxvAL': function (_0x547f5a, _0x520cbe) { return _0x547f5a | _0x520cbe; }, 'QLfNa': function (_0x4beb5c, _0x3c2f87) { return _0x4beb5c - _0x3c2f87; } }; var _0x49ea68 = [], _0x4da8c8 = _0x2fa474[_0x5415('‫10', 'Km34')], _0x3e5a06 = _0x2fa474[_0x5415('‮11', 'GP17')](''), _0x25344a = ''; for (; _0x25344a = _0x3e5a06[_0x5415('‮12', 'GP17')]();) { if (_0x397acc['xjElI'](Math['random'](), _0x4da8c8) < _0x4b9a8d) { _0x49ea68['push'](_0x25344a); if (_0x397acc[_0x5415('‫13', 'ZTeC')](--_0x4b9a8d, 0x0)) { break; } } _0x4da8c8--; } for (var _0x472b1f = '', _0x34d503 = 0x0; _0x397acc[_0x5415('‫14', 'dW2c')](_0x34d503, _0x49ea68['length']); _0x34d503++) { if (_0x397acc[_0x5415('‫15', 'qY&b')] === _0x397acc['dBfoL']) { var _0x365eee = { 'pbNab': function (_0x29d6f2, _0x472b1f) { return _0x397acc[_0x5415('‫16', '%mwc')](_0x29d6f2, _0x472b1f); } }; let _0x33bf75 = Date[_0x5415('‫17', 'EG04')](); let _0x2774bb = format(_0x33bf75, _0x397acc['VeKRJ']); let _0x3c6132 = this['genKey'](this['tk'], this['fp'], _0x2774bb[_0x5415('‮18', '@#i1')](), this[_0x5415('‮19', 'qM5M')], CryptoJS)[_0x5415('‫1a', 'jWkc')](); let _0x5b5010 = ''; _0x5b5010 = Object[_0x5415('‮1b', 'sE9A')](body)[_0x5415('‮1c', 'jWkc')](function (_0x43f552) { return _0x365eee['pbNab'](_0x43f552, ':') + (_0x43f552 == 'body' ? CryptoJS[_0x5415('‮1d', 'uk[i')](body[_0x43f552])[_0x5415('‮1e', ']a%F')](CryptoJS[_0x5415('‫1f', 'qKoq')]['Hex']) : body[_0x43f552]); })[_0x5415('‮20', 'EqJB')]('&'); _0x5b5010 = CryptoJS['HmacSHA256'](_0x5b5010, _0x3c6132)['toString'](); return _0x397acc[_0x5415('‫21', '!Pc6')](encodeURIComponent, _0x2774bb + ';' + this['fp'] + ';' + this[_0x5415('‮22', '[p0t')][_0x5415('‫23', 'Y7(9')]() + ';' + this['tk'] + ';' + _0x5b5010 + ';3.0;' + _0x33bf75[_0x5415('‫24', '[p0t')]()); } else { var _0x4b0cb5 = _0x397acc[_0x5415('‫25', '@#i1')](Math[_0x5415('‮26', 'CuXF')]() * _0x397acc[_0x5415('‫27', 'U]St')](_0x49ea68[_0x5415('‫28', '26[F')], _0x34d503), 0x0); _0x472b1f += _0x49ea68[_0x4b0cb5]; _0x49ea68[_0x4b0cb5] = _0x49ea68[_0x397acc[_0x5415('‫29', 'B#Dl')](_0x397acc['QLfNa'](_0x49ea68[_0x5415('‫2a', '08)C')], _0x34d503), 0x1)]; } } return _0x472b1f; } [_0x5415('‮2b', 'U69r')]() { var _0x1fba74 = { 'CgcBh': function (_0xabee9f, _0x124d1) { return _0xabee9f === _0x124d1; }, 'CkDdY': function (_0x12f884, _0x65d2ae) { return _0x12f884 < _0x65d2ae; }, 'doxXy': function (_0x223064, _0x30e9c1) { return _0x223064 !== _0x30e9c1; }, 'juLNg': _0x5415('‮2c', '2huC'), 'nwTKN': _0x5415('‫2d', 'Scuv'), 'gdfmI': _0x5415('‫2e', 'Y7(9'), 'AfTZW': _0x5415('‫2f', 's!fW'), 'OtWBl': function (_0x6a40aa, _0x148b86) { return _0x6a40aa | _0x148b86; }, 'FlLDh': function (_0x3d3759, _0x1a7ea8) { return _0x3d3759 * _0x1a7ea8; } }; var _0x390447, _0x41e9b4, _0x3f2208 = _0x1fba74['CgcBh'](void 0x0, _0x34af1c = (_0x41e9b4 = _0x1fba74['CkDdY'](0x0, arguments['length']) && _0x1fba74['doxXy'](void 0x0, arguments[0x0]) ? arguments[0x0] : {})[_0x5415('‫30', 'qeGv')]) ? 0xa : _0x34af1c, _0x34af1c = void 0x0 === (_0x34af1c = _0x41e9b4[_0x5415('‫31', 'fH]E')]) ? _0x1fba74['juLNg'] : _0x34af1c, _0x333924 = ''; if ((_0x41e9b4 = _0x41e9b4[_0x5415('‮32', '08)C')]) && _0x1fba74[_0x5415('‮33', 'Scuv')] == typeof _0x41e9b4) _0x390447 = _0x41e9b4; else switch (_0x34af1c) { case _0x1fba74[_0x5415('‮34', 's!fW')]: _0x390447 = _0x5415('‮35', 'j(E*'); break; case _0x1fba74['AfTZW']: _0x390447 = _0x5415('‮36', 'EqJB'); break; case _0x1fba74['juLNg']: default: _0x390447 = _0x5415('‫37', 'Scuv'); }for (; _0x3f2208--;)_0x333924 += _0x390447[_0x1fba74['OtWBl'](_0x1fba74[_0x5415('‫38', 'Y7(9')](Math['random'](), _0x390447['length']), 0x0)]; return _0x333924; } async['__genAlgo']() { var _0x4fb0d6 = { 'BvFzp': _0x5415('‫39', 'IiB)'), 'MdhMe': '3.0', 'RpZfl': 'application/json', 'MKECn': 'zh-CN,zh;q=0.9' }; let { data } = await axios[_0x5415('‮3a', '26[F')](_0x4fb0d6[_0x5415('‫3b', 'B#Dl')], { 'version': _0x4fb0d6['MdhMe'], 'fp': this['fp'], 'appId': this['appId']['toString'](), 'timestamp': Date[_0x5415('‫3c', 'jWkc')](), 'platform': 'web', 'expandParams': '' }, { 'headers': { 'Host': _0x5415('‮3d', '08)C'), 'accept': _0x4fb0d6['RpZfl'], 'Accept-Encoding': _0x5415('‮3e', 'J5d)'), 'Accept-Language': _0x4fb0d6['MKECn'], 'content-type': _0x4fb0d6[_0x5415('‮3f', '26[F')], 'user-agent': this['ua'] } }); this['tk'] = data[_0x5415('‮40', '[2Fe')]['result']['tk']; this[_0x5415('‮41', 'J5d)')] = new Function(_0x5415('‮42', 'xbS3') + data[_0x5415('‮43', 'U]St')][_0x5415('‮44', 'dW2c')][_0x5415('‮45', '@#i1')])(); } [_0x5415('‮46', '[p0t')](_0x27dcb3 = '', _0x2b7e44 = '', _0x4e2291 = '', _0xbae2cd = '', _0x5019a1 = []) { let _0x1cd59a = '' + _0x27dcb3 + _0x2b7e44 + _0x4e2291 + _0xbae2cd + this['rd']; return _0x5019a1[this[_0x5415('‮47', 'uk[i')]](_0x1cd59a, _0x27dcb3); } ['__genH5st'](_0xe3f9ff = []) { var _0x1c094d = { 'ukSon': function (_0x4d2227, _0x812830) { return _0x4d2227 + _0x812830; }, 'REcVU': function (_0x449979, _0x4e5417) { return _0x449979 + _0x4e5417; }, 'qBNye': function (_0x1acf3a, _0x125f4f) { return _0x1acf3a == _0x125f4f; }, 'MSiuD': 'body', 'zRsPK': function (_0x2c686b, _0x5319e6, _0x1314ea) { return _0x2c686b(_0x5319e6, _0x1314ea); }, 'Pegnn': 'yyyyMMddHHmmssSSS', 'lELTq': _0x5415('‫48', 'EG04'), 'MvVvr': function (_0x50fe07, _0x442733) { return _0x50fe07(_0x442733); } }; let _0x3d71b0 = Date[_0x5415('‫17', 'EG04')](); let _0x1cf67b = _0x1c094d[_0x5415('‮49', ')Jh)')](format, _0x3d71b0, _0x1c094d[_0x5415('‫4a', 'sE9A')]); let _0x459b4d = this[_0x5415('‫4b', ']a%F')](this['tk'], this['fp'], _0x1cf67b[_0x5415('‮4c', '@7(B')](), this[_0x5415('‫4d', 'U69r')], CryptoJS)[_0x5415('‫4e', 'CuXF')](); let _0x4f065e = ''; _0x4f065e = Object[_0x5415('‫4f', '[p0t')](_0xe3f9ff)[_0x5415('‫50', '%mwc')](function (_0x288ad7) { return _0x1c094d[_0x5415('‫51', 'nmiD')](_0x1c094d[_0x5415('‮52', 'Km34')](_0x288ad7, ':'), _0x1c094d['qBNye'](_0x288ad7, _0x1c094d[_0x5415('‫53', '!Pc6')]) ? CryptoJS[_0x5415('‫54', 'J5d)')](_0xe3f9ff[_0x288ad7])[_0x5415('‮55', '1gK4')](CryptoJS[_0x5415('‫56', 'ZTeC')][_0x5415('‮57', 'uk[i')]) : _0xe3f9ff[_0x288ad7]); })[_0x1c094d['lELTq']]('&'); _0x4f065e = CryptoJS[_0x5415('‮58', 'j(E*')](_0x4f065e, _0x459b4d)[_0x5415('‮59', 'qY&b')](); return _0x1c094d['MvVvr'](encodeURIComponent, _0x1cf67b + ';' + this['fp'] + ';' + this[_0x5415('‮5a', '08)C')]['toString']() + ';' + this['tk'] + ';' + _0x4f065e + ';3.0;' + _0x3d71b0[_0x5415('‮5b', 'fH]E')]()); } }; _0xodi = 'jsjiami.com.v6';
// prettier-ignore
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
