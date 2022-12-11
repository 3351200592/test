/*
种豆得豆
活动入口：京东APP我的-更多工具-种豆得豆
每个京东账号每天只能帮助3个人。多出的助力码将会助力失败。
1 7-21/2 * * * jd_plantBean.js
annyooo 修改
*/

const $ = new Env('京东种豆得豆');
let jdNotify = true;//是否开启静默运行。默认true开启
let cookiesArr = [], cookie = '', notify = '', option = '', message = '', subTitle = '';
let newShareCodes = [];

const axios = require('axios')
const format = require('date-fns/format')
const CryptoJS = require('crypto-js')

const thefs = require('fs');

let outpath = './PlantBean_HelpOut.json'
$.HelpOuts = { "thisDay": new Date().getDate(), "helpOut": [], "helpFull": [] }
$.Helptext = ""
$.helpJson = {}
$.unLogins = []
$.otherCodes = []
$.myCodes = []
$.myFronts = []
$.helpRunout = []
$.blackIndexs = []

// 互助环境变量1 设定固定车头助力码、大小写逗号隔开、连续多个可直接用 - 、如：1-10，可混用如：1,2,3,7-15
let helpFronts = $.isNode() ? (process.env.jd_helpFronts ? process.env.jd_helpFronts : []) : []
// 互助环境变量2 除了固定互助码放前面被助力 之外的账号 设定随机还是顺序助力，true为随机，false为顺序
let helpRandom = $.isNode() ? (process.env.jd_helpRandom ? process.env.jd_helpRandom : false) : false

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

//京东接口地址
const JD_API_HOST = 'https://api.m.jd.com/client.action';

let allMessage = ``;
let currentRoundId = null;//本期活动id
let lastRoundId = null;//上期id
let roundList = [];
let awardState = '';//上期活动的京豆是否收取
let num;

let h5stTool = {
    "plantBeanIndex": "d246a",
    "cultureBean": "6a216",
    "receiveNutrients": "b56b8",
    "productNutrientsTask": "a4e2d",
    "shopNutrientsTask": "19c88",
    "collectUserNutr": "14357",
    "receiveNutrientsTask": "d22ac",
    "receivedBean": "d4a66"
}


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
            await getUA();
            for (let t in h5stTool) {
                $['h5stTool_' + h5stTool[t]] = ''
            }
            await TotalBean();
            console.log(`\n\n\n开始【京东账号${$.index}】${$.nickName || $.UserName}\n`);
            if (!$.isLogin) {
                console.log("Cookie已失效. . .")
                $.unLogins.push($.index)

                if ($.isNode()) {
                    await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
                }

                if ($.myFronts.includes($.index)) $.myFronts = $.myFronts.filter(function (item) { return item !== $.index })

                continue
            }
            message = '';
            subTitle = '';
            option = {};
            await jdPlantBean();
            await showMsg();
            if ($.index % 5 == 0) {
                console.log(`\n\n***************** 每5个账号休息半分钟、已用时${parseInt((new Date().getTime() - $.theStart) / 1000)}秒 *****************`)
                await $.wait(parseInt(Math.random() * 5000 + 30000, 10))
            }
        }
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
            await getUA();
            for (let t in h5stTool) {
                $['h5stTool_' + h5stTool[t]] = ''
            }
            console.log(`\n\n*********开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
            if ($.unLogins.includes($.index)) {
                console.log("Cookie已失效. . .")
                continue
            }
            if ($.helpRunout.includes($.index) || $.helpOut.includes($.UserName)) {
                console.log("助力次数耗尽、不执行此账号. . .")
                continue
            }
            if ($.blackIndexs.includes($.index)) {
                console.log("种豆数据异常、不执行此账号. . .")
                continue
            }
            await shareCodesFormat();
            if (!newShareCodes.length) {
                console.log("已无账号需要助力，助力结束")
                break
            }
            $.heplTimes = $.heplTimes + 1
            await doHelp(); //助力
            if ($.heplTimes % 5 == 0) {
                console.log(`\n\n***************** 每请求5个账号休息半分钟、已用时${parseInt((new Date().getTime() - $.theStart) / 1000)}秒 *****************\n`)
                await $.wait(parseInt(Math.random() * 5000 + 30000, 10))
            }
        }
    }

    thefs.writeFile(outpath, JSON.stringify($.HelpOuts), function (err) {
        if (err) console.log(`\n\n写入缓存失败：${err}\n`)
        else console.log("\n\n写入缓存成功 . . .\n")
    })
    await $.wait(1000)

    if ($.isNode() && allMessage) {
        await notify.sendNotify(`${$.name}`, `${allMessage}`)
    }
})()
    .catch((e) => {
        $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
        $.done();
    })

async function jdPlantBean(f = 0) {
    try {
        // console.log(`获取任务及基本信息`)
        await plantBeanIndex();
        if (!$.plantBeanIndexResult) return
        if ($.plantBeanIndexResult.errorCode === 'PB101') {
            console.log(`\n活动太火爆了，还是去买买买吧！\n`)
            if (!$.blackIndexs.includes($.index)) $.blackIndexs.push($.index)
            return
        }
        if ($.plantBeanIndexResult.data) {
            for (let i = 0; i < $.plantBeanIndexResult.data.roundList.length; i++) {
                if ($.plantBeanIndexResult.data.roundList[i].roundState === "2") {
                    num = i
                    break
                }
            }
        }
        // console.log(plantBeanIndexResult.data.taskList);
        if ($.plantBeanIndexResult && $.plantBeanIndexResult.code === '0' && $.plantBeanIndexResult.data) {
            const shareUrl = $.plantBeanIndexResult.data.jwordShareInfo.shareUrl
            $.thisCode = getParam(shareUrl, 'plantUuid')
            console.log(`互助码:${$.thisCode}\n`);

            let thisarr = []
            thisarr.push($.index)
            thisarr.push($.thisCode)
            thisarr.push($.UserName)
            if (checkArr($.otherCodes, $.thisCode) == -1 && !$.myFronts.includes($.index)) $.otherCodes.push(thisarr)
            if (checkArr($.myCodes, $.thisCode) == -1 && $.myFronts.length > 0 && $.myFronts.includes($.index)) $.myCodes.push(thisarr)

            roundList = $.plantBeanIndexResult.data.roundList;
            currentRoundId = roundList[num].roundId;//本期的roundId
            lastRoundId = roundList[num - 1].roundId;//上期的roundId
            awardState = roundList[num - 1].awardState;
            $.taskList = $.plantBeanIndexResult.data.taskList;
            subTitle = `【京东昵称】${$.plantBeanIndexResult.data.plantUserInfo.plantNickName}`;
            message += `【上期时间】${roundList[num - 1].dateDesc.replace('上期 ', '')}\n`;
            message += `【上期成长值】${roundList[num - 1].growth}\n`;
            await receiveNutrients();//定时领取营养液
            await doTask();//做日常任务
            //await doEgg();//注释结束任务
            await stealFriendWater();
            await doCultureBean();
            await doGetReward();
            await showTaskProcess();
            await plantShareSupportList();
        } else {
            let r = $.plantBeanIndexResult
            if (f < 4 && r && ((r.errorMessage && /营养液不见了/g.test(r.errorMessage)) || Number(r.code) == 413)) {
                f = f + 1
                console.log(`初始化失败、重试第${f}次....`)
                await $.wait(3000)
                await jdPlantBean(f)
            } else {
                console.log(`初始化种豆得豆-数据异常:  ${JSON.stringify(r) || "未知"}`);
                if (!$.blackIndexs.includes($.index)) $.blackIndexs.push($.index)
            }
        }
    } catch (e) {
        $.logErr(e);
        const errMsg = `京东账号${$.index} ${$.nickName || $.UserName}\n任务执行异常，请检查执行日志 ‼️‼️`;
        if ($.isNode()) await notify.sendNotify(`${$.name}`, errMsg);
        $.msg($.name, '', `${errMsg}`)
    }
}

async function doGetReward() {
    console.log(`【上轮京豆】${awardState === '4' ? '采摘中' : awardState === '5' ? '可收获了' : '已领取'}`);
    if (awardState === '4') {
        //京豆采摘中...
        message += `【上期状态】${roundList[num - 1].tipBeanEndTitle}\n`;
    } else if (awardState === '5') {
        //收获
        await getReward();
        console.log('开始领取京豆');
        if ($.getReward && $.getReward.data && $.getReward.code === '0') {
            console.log('京豆领取成功');
            message += `【上期兑换京豆】${$.getReward.data.awardBean}个\n`;
            $.msg($.name, subTitle, message);
            allMessage += `京东账号${$.index} ${$.nickName}\n${message}${$.index !== cookiesArr.length ? '\n\n' : ''}`
            // if ($.isNode()) {
            //   await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName || $.UserName}`, `京东账号${$.index} ${$.nickName}\n${message}`);
            // }
        } else {
            console.log(`$.getReward 异常：${JSON.stringify($.getReward)}`)
        }
    } else if (awardState === '6') {
        //京豆已领取
        message += `【上期兑换京豆】${roundList[num - 1].awardBeans}个\n`;
    }
    if (roundList[num].dateDesc.indexOf('本期 ') > -1) {
        roundList[num].dateDesc = roundList[num].dateDesc.substr(roundList[num].dateDesc.indexOf('本期 ') + 3, roundList[num].dateDesc.length);
    }
    message += `【本期时间】${roundList[num].dateDesc}\n`;
    message += `【本期成长值】${roundList[num].growth}\n`;
}

async function doCultureBean(f = 0) {
    await plantBeanIndex();
    if ($.plantBeanIndexResult && $.plantBeanIndexResult.data && $.plantBeanIndexResult.code === '0') {
        const plantBeanRound = $.plantBeanIndexResult.data.roundList[num]
        if (plantBeanRound.roundState === '2') {
            //收取营养液
            if (plantBeanRound.bubbleInfos && plantBeanRound.bubbleInfos.length) console.log(`开始收取营养液`)
            for (let bubbleInfo of plantBeanRound.bubbleInfos) {
                console.log(`收取-${bubbleInfo.name}-的营养液`)
                await cultureBean(plantBeanRound.roundId, bubbleInfo.nutrientsType)
                console.log(`收取营养液结果:${JSON.stringify($.cultureBeanRes)}`)
            }
        }
    } else {
        let r = $.plantBeanIndexResult
        if (f < 4 && r && ((r.errorMessage && /营养液不见了/g.test(r.errorMessage)) || Number(r.code) == 413)) {
            f = f + 1
            console.log(`plantBeanIndexResult请求失败、重试第${f}次....`)
            await $.wait(3000)
            await doCultureBean(f)
        } else {
            console.log(`plantBeanIndexResult:${JSON.stringify(r)}`)
        }
    }
}

async function stealFriendWater(f = 0) {
    await stealFriendList();
    if ($.stealFriendList && $.stealFriendList.code === '0') {
        if ($.stealFriendList.data && $.stealFriendList.data.tips) {
            console.log('\n\n今日偷取好友营养液已达上限\n\n');
            return
        }
        if ($.stealFriendList.data && $.stealFriendList.data.friendInfoList && $.stealFriendList.data.friendInfoList.length > 0) {
            let nowTimes = new Date(new Date().getTime() + new Date().getTimezoneOffset() * 60 * 1000 + 8 * 60 * 60 * 1000);
            for (let item of $.stealFriendList.data.friendInfoList) {
                if (new Date(nowTimes).getHours() === 20) {
                    if (item.nutrCount >= 2) {
                        // console.log(`可以偷的好友的信息::${JSON.stringify(item)}`);
                        console.log(`可以偷的好友的信息paradiseUuid::${JSON.stringify(item.paradiseUuid)}`);
                        await collectUserNutr(item.paradiseUuid);
                        console.log(`偷取好友营养液情况:${JSON.stringify($.stealFriendRes)}`)
                        if ($.stealFriendRes && $.stealFriendRes.code === '0') {
                            if ($.stealFriendRes.data && $.stealFriendRes.data.collectMsg && /已达上限/g.test($.stealFriendRes.data.collectMsg)) {
                                console.log('\n今日偷取好友营养液已达上限\n')
                                return
                            } else {
                                console.log(`偷取好友营养液成功`)
                            }
                        }
                    }
                } else {
                    if (item.nutrCount >= 3) {
                        // console.log(`可以偷的好友的信息::${JSON.stringify(item)}`);
                        console.log(`可以偷的好友的信息paradiseUuid::${JSON.stringify(item.paradiseUuid)}`);
                        await collectUserNutr(item.paradiseUuid);
                        console.log(`偷取好友营养液情况:${JSON.stringify($.stealFriendRes)}`)
                        if ($.stealFriendRes && $.stealFriendRes.code === '0') {
                            if ($.stealFriendRes.data && $.stealFriendRes.data.collectMsg && /已达上限/g.test($.stealFriendRes.data.collectMsg)) {
                                console.log('\n今日偷取好友营养液已达上限\n')
                                return
                            } else {
                                console.log(`偷取好友营养液成功`)
                            }
                        }
                    }
                }
            }
        }
    } else {
        let r = $.stealFriendList
        if (f < 4 && r && ((r.errorMessage && /营养液不见了/g.test(r.errorMessage)) || Number(r.code) == 411)) {
            f = f + 1
            console.log(`stealFriendList请求失败、重试第${f}次....`)
            await $.wait(3000)
            await stealFriendWater(f)
        } else {
            console.log(`stealFriendList 异常： ${JSON.stringify($.stealFriendList)}`)
        }
    }
}

async function doEgg() {
    await egg();
    if ($.plantEggLotteryRes && $.plantEggLotteryRes.data && $.plantEggLotteryRes.code === '0') {
        if ($.plantEggLotteryRes.data.restLotteryNum > 0) {
            const eggL = new Array($.plantEggLotteryRes.data.restLotteryNum).fill('');
            console.log(`目前共有${eggL.length}次扭蛋的机会`)
            for (let i = 0; i < eggL.length; i++) {
                console.log(`开始第${i + 1}次扭蛋`);
                await plantEggDoLottery();
                console.log(`天天扭蛋成功：${JSON.stringify($.plantEggDoLotteryResult)}`);
            }
        } else {
            console.log('暂无扭蛋机会')
        }
    } else {
        console.log('查询天天扭蛋的机会失败' + JSON.stringify($.plantEggLotteryRes))
    }
}

async function doTask() {
    if ($.taskList && $.taskList.length > 0) {
        for (let item of $.taskList) {
            if (item.isFinished === 1) {
                console.log(`${item.taskName} 任务已完成\n`);
                continue;
            } else {
                if (item.taskType === 8) {
                    console.log(`\n【${item.taskName}】任务未完成,需自行手动去京东APP完成，${item.desc}营养液\n`)
                } else {
                    console.log(`\n【${item.taskName}】任务未完成,${item.desc}营养液\n`)
                }
            }
            if (item.dailyTimes === 1 && item.taskType !== 8) {
                console.log(`\n开始做 ${item.taskName}任务`);
                // $.receiveNutrientsTaskRes = await receiveNutrientsTask(item.taskType);
                await receiveNutrientsTask(item.taskType);
                console.log(`做 ${item.taskName}任务结果:${JSON.stringify($.receiveNutrientsTaskRes)}\n`);
            }
            if (item.taskType === 3) {
                //浏览店铺
                console.log(`开始做 ${item.taskName}任务`);
                let unFinishedShopNum = item.totalNum - item.gainedNum;
                if (unFinishedShopNum === 0) {
                    continue
                }
                await shopTaskList();
                const { data } = $.shopTaskListRes;
                let goodShopListARR = [], moreShopListARR = [], shopList = [];
                const { goodShopList, moreShopList } = data;
                if (goodShopList && goodShopList.length > 0) {
                    for (let i of goodShopList) {
                        if (i.taskState === '2') {
                            goodShopListARR.push(i);
                        }
                    }
                }
                if (moreShopList && moreShopList.length > 0) {
                    for (let j of moreShopList) {
                        if (j.taskState === '2') {
                            moreShopListARR.push(j);
                        }
                    }
                }
                shopList = goodShopListARR.concat(moreShopListARR);
                if (shopList && shopList.length > 0) {
                    for (let shop of shopList) {
                        const { shopId, shopTaskId } = shop;
                        const body = {
                            "monitor_refer": "plant_shopNutrientsTask",
                            "shopId": shopId,
                            "shopTaskId": shopTaskId
                        }
                        for (let f = 0; f < 3; f++) {
                            const shopRes = await requestGet('shopNutrientsTask', body);
                            let r = shopRes
                            if (r && ((r.errorMessage && /营养液不见了/g.test(r.errorMessage)) || Number(r.code) == 413)) {
                                console.log(`浏览店铺 请求失败、重试第${f + 1}次....`)
                                await $.wait(3000)
                            } else {
                                console.log(`shopRes结果:${JSON.stringify(shopRes)}`);
                                if (shopRes && shopRes.code === '0') {
                                    if (shopRes.data && shopRes.data.nutrState && shopRes.data.nutrState === '1') {
                                        unFinishedShopNum--;
                                    }
                                }
                                break
                            }
                        }
                        if (unFinishedShopNum <= 0) {
                            console.log(`${item.taskName}任务已做完\n`)
                            break;
                        }
                    }
                }
            }
            if (item.taskType === 5) {
                //挑选商品
                console.log(`开始做 ${item.taskName}任务`);
                let unFinishedProductNum = item.totalNum - item.gainedNum;
                if (unFinishedProductNum === 0) {
                    continue
                }
                await productTaskList();
                // console.log('productTaskList', $.productTaskList);
                const { data } = $.productTaskList;
                let productListARR = [], productList = [];
                const { productInfoList } = data;
                for (let i = 0; i < productInfoList.length; i++) {
                    for (let j = 0; j < productInfoList[i].length; j++) {
                        productListARR.push(productInfoList[i][j]);
                    }
                }
                for (let i of productListARR) {
                    if (i.taskState === '2') {
                        productList.push(i);
                    }
                }
                for (let product of productList) {
                    const { skuId, productTaskId } = product;
                    const body = {
                        "monitor_refer": "plant_productNutrientsTask",
                        "productTaskId": productTaskId,
                        "skuId": skuId
                    }
                    const productRes = await requestGet('productNutrientsTask', body);
                    if (productRes && productRes.code === '0') {
                        // console.log('nutrState', productRes)
                        //这里添加多重判断,有时候会出现活动太火爆的问题,导致nutrState没有
                        if (productRes.data && productRes.data.nutrState && productRes.data.nutrState === '1') {
                            unFinishedProductNum--;
                        }
                    }
                    if (unFinishedProductNum <= 0) {
                        console.log(`${item.taskName}任务已做完\n`)
                        break;
                    }
                }
            }
            if (item.taskType === 10) {
                //关注频道
                console.log(`开始做 ${item.taskName}任务`);
                let unFinishedChannelNum = item.totalNum - item.gainedNum;
                if (unFinishedChannelNum === 0) {
                    continue
                }
                await plantChannelTaskList();
                const { data } = $.plantChannelTaskList;
                // console.log('goodShopList', data.goodShopList);
                // console.log('moreShopList', data.moreShopList);
                let goodChannelListARR = [], normalChannelListARR = [], channelList = [];
                const { goodChannelList, normalChannelList } = data;
                for (let i of goodChannelList) {
                    if (i.taskState === '2') {
                        goodChannelListARR.push(i);
                    }
                }
                for (let j of normalChannelList) {
                    if (j.taskState === '2') {
                        normalChannelListARR.push(j);
                    }
                }
                channelList = goodChannelListARR.concat(normalChannelListARR);
                for (let channelItem of channelList) {
                    const { channelId, channelTaskId } = channelItem;
                    const body = {
                        "channelId": channelId,
                        "channelTaskId": channelTaskId
                    }
                    const channelRes = await requestGet('plantChannelNutrientsTask', body);
                    console.log(`channelRes结果:${JSON.stringify(channelRes)}`);
                    if (channelRes && channelRes.code === '0') {
                        if (channelRes.data && channelRes.data.nutrState && channelRes.data.nutrState === '1') {
                            unFinishedChannelNum--;
                        }
                    }
                    if (unFinishedChannelNum <= 0) {
                        console.log(`${item.taskName}任务已做完\n`)
                        break;
                    }
                }
            }
        }
    }
}

function showTaskProcess(f = 0) {
    return new Promise(async resolve => {
        $.taskList = []
        await plantBeanIndex();
        if ($.plantBeanIndexResult && $.plantBeanIndexResult.data) {
            $.taskList = $.plantBeanIndexResult.data.taskList;
            if ($.taskList && $.taskList.length > 0) {
                console.log("     任务   进度");
                for (let item of $.taskList) {
                    console.log(`[${item["taskName"]}]  ${item["gainedNum"]}/${item["totalNum"]}   ${item["isFinished"]}`);
                }
            }
        } else {
            let r = $.plantBeanIndexResult
            if (f < 4 && r && ((r.errorMessage && /营养液不见了/g.test(r.errorMessage)) || Number(r.code) == 413)) {
                f = f + 1
                console.log(`plantBeanIndexResult请求失败、重试第${f}次....`)
                await $.wait(3000)
                await showTaskProcess(f)
            } else {
                console.log(`plantBeanIndexResult:${JSON.stringify(r)}`)
            }
        }
        resolve()
    })
}

//助力好友
async function doHelp() {
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
        await helpShare(code);
        if ($.helpResult && $.helpResult.code === '0') {
            // console.log(`助力好友结果: ${JSON.stringify($.helpResult)}`);


            if ($.helpResult.data && $.helpResult.data.helpShareRes) {
                if ($.helpResult.data.helpShareRes.state === '1') {
                    console.log(`助力好友【${$.theName}】成功`)
                    console.log(`${$.helpResult.data.helpShareRes.promptText}\n`);
                } else if ($.helpResult.data.helpShareRes.state === '2') {
                    console.log(`助力好友【${$.theName}】失败，您今天助力次数已耗尽`);
                    console.log(`${$.helpResult.data.helpShareRes.promptText}\n`);
                    if (!$.helpRunout.includes($.index)) $.helpRunout.push($.index)
                    if ($.HelpOuts.helpOut.indexOf($.UserName) == -1) $.HelpOuts.helpOut.push($.UserName)
                    break;
                } else if ($.helpResult.data.helpShareRes.state === '3') {
                    console.log(` 该好友【${$.theName}】今日已满9人助力/20瓶营养液,明天再来为Ta助力吧`)
                    console.log(`${$.helpResult.data.helpShareRes.promptText}\n`);
                    if (checkArr($.myCodes, code) > -1) $.myCodes.splice(checkArr($.myCodes, code), 1) // 剔除助力已满的助力码
                    if (checkArr($.otherCodes, code) > -1) $.otherCodes.splice(checkArr($.otherCodes, code), 1) // 剔除助力已满的助力码
                    if ($.HelpOuts.helpFull.indexOf($.theName) == -1) $.HelpOuts.helpFull.push($.theName)
                } else if ($.helpResult.data.helpShareRes.state === '4') {
                    console.log(`助力好友【${$.theName}】失败`);
                    console.log(`${$.helpResult.data.helpShareRes.promptText}\n`)
                } else {
                    console.log(`助力好友【${$.theName}】其他情况：${JSON.stringify($.helpResult.data.helpShareRes)}\n`);
                }
            } else console.log(`助力好友【${$.theName}】失败1: ${JSON.stringify($.helpResult)}\n`);
        } else {
            console.log(`助力好友【${$.theName}】失败2: ${JSON.stringify($.helpResult)}\n`);
        }
    }
}

async function showMsg() {
    $.log(`\n${message}\n`);
    jdNotify = $.getdata('jdPlantBeanNotify') ? $.getdata('jdPlantBeanNotify') : jdNotify;
    if (!jdNotify || jdNotify === 'false') {
        $.msg($.name, subTitle, message);
    }
}

// ================================================此处是API=================================
//每轮种豆活动获取结束后,自动收取京豆
async function getReward() {
    const body = {
        "roundId": lastRoundId
    }
    $.getReward = await request('receivedBean', body);
}

//收取营养液
async function cultureBean(currentRoundId, nutrientsType) {
    let functionId = arguments.callee.name.toString();
    let body = {
        "roundId": currentRoundId,
        "nutrientsType": nutrientsType,
    }
    for (let f = 0; f < 3; f++) {
        $.cultureBeanRes = await request(functionId, body)

        let r = $.cultureBeanRes
        if (r && ((r.errorMessage && /营养液不见了/g.test(r.errorMessage)) || Number(r.code) == 413)) {
            console.log(`收取营养液 请求失败、重试第${f + 1}次....`)
            await $.wait(3000)
        } else {
            break
        }
    }
}

//偷营养液大于等于3瓶的好友
//①查询好友列表
async function stealFriendList() {
    const body = {
        pageNum: '1'
    }
    $.stealFriendList = await request('plantFriendList', body);
}

//②执行偷好友营养液的动作
async function collectUserNutr(paradiseUuid) {
    console.log('开始偷好友');
    // console.log(paradiseUuid);
    let functionId = arguments.callee.name.toString();
    const body = {
        "paradiseUuid": paradiseUuid,
        "roundId": currentRoundId
    }
    for (let f = 0; f < 3; f++) {
        $.stealFriendRes = await request(functionId, body);

        let r = $.stealFriendRes
        if (r && ((r.errorMessage && /活动太火爆/g.test(r.errorMessage)) || Number(r.code) == 413)) {
            console.log(`偷营养液 请求失败、重试第${f + 1}次....`)
            await $.wait(3000)
        } else {
            break
        }
    }
}

async function receiveNutrients() {
    $.receiveNutrientsRes = await request('receiveNutrients', { "roundId": currentRoundId, "monitor_refer": "plant_receiveNutrients" })
    // console.log(`定时领取营养液结果:${JSON.stringify($.receiveNutrientsRes)}`)
}

async function plantEggDoLottery() {
    $.plantEggDoLotteryResult = await requestGet('plantEggDoLottery');
}

//查询天天扭蛋的机会
async function egg() {
    $.plantEggLotteryRes = await requestGet('plantEggLotteryIndex');
}

async function productTaskList() {
    let functionId = arguments.callee.name.toString();
    $.productTaskList = await requestGet(functionId, { "monitor_refer": "plant_productTaskList" });
}
async function plantChannelTaskList() {
    let functionId = arguments.callee.name.toString();
    $.plantChannelTaskList = await requestGet(functionId);
    // console.log('$.plantChannelTaskList', $.plantChannelTaskList)
}

async function shopTaskList() {
    let functionId = arguments.callee.name.toString();
    $.shopTaskListRes = await requestGet(functionId, { "monitor_refer": "plant_receiveNutrients" });
    // console.log('$.shopTaskListRes', $.shopTaskListRes)
}

async function receiveNutrientsTask(awardType) {
    const functionId = arguments.callee.name.toString();
    const body = {
        "monitor_refer": "receiveNutrientsTask",
        "awardType": `${awardType}`,
    }
    $.receiveNutrientsTaskRes = await requestGet(functionId, body);
}

async function plantShareSupportList() {
    $.shareSupportList = await requestGet('plantShareSupportList', { "roundId": "" });
    if ($.shareSupportList && $.shareSupportList.code === '0') {
        const { data } = $.shareSupportList;
        //当日北京时间0点时间戳
        const UTC8_Zero_Time = parseInt((Date.now() + 28800000) / 86400000) * 86400000 - 28800000;
        //次日北京时间0点时间戳
        const UTC8_End_Time = parseInt((Date.now() + 28800000) / 86400000) * 86400000 - 28800000 + (24 * 60 * 60 * 1000);
        let friendList = [];
        data.map(item => {
            if (UTC8_Zero_Time <= item['createTime'] && item['createTime'] < UTC8_End_Time) {
                friendList.push(item);
            }
        })
        message += `【助力您的好友】共${friendList.length}人`;
    } else {
        console.log(`异常情况：${JSON.stringify($.shareSupportList)}`)
    }
}

//助力好友的api
async function helpShare(plantUuid, f = 0) {
    // console.log(`\n开始助力好友: ${plantUuid}`);
    const body = {
        "plantUuid": plantUuid,
        "wxHeadImgUrl": "",
        "shareUuid": "",
        "followType": "1",
    }
    $.helpResult = await request(`plantBeanIndex`, body);
    let r = $.helpResult
    if (f < 4 && r && ((r.errorMessage && /营养液不见了/g.test(r.errorMessage)) || Number(r.code) == 413)) {
        f = f + 1
        console.log(`助力请求失败、重试第${f}次....`)
        await $.wait(3000)
        await helpShare(plantUuid, f)
    } else {
        console.log(`助力结果的code: ${$.helpResult && $.helpResult.code}`);
    }
}

async function plantBeanIndex() {
    $.plantBeanIndexResult = await request('plantBeanIndex');//plantBeanIndexBody
}

//格式化助力码
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
        // console.log('开始获取种豆得豆配置文件\n')
        notify = $.isNode() ? require('./sendNotify') : '';
        //Node.js用户请在jdCookie.js处填写京东ck;
        const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
        const jdPlantBeanShareCodes = $.isNode() ? require('./jdPlantBeanShareCodes.js') : '';
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
        console.log(`你的互助配置如下：\n互助模式：${helpRandom + "" === "true" ? '随机互助' : '顺序互助'}\n优先被助力账号：${$.myFronts.length > 0 ? $.myFronts.toString() : '未设定'}`);
        console.log(`\n环境变量设置提示：\nexport jd_helpFronts="1,2,3-5" 表示账号12345固定优先被助力\nexport jd_helpRandom="true" 表示固定助力过后全部随机助力、反之顺序助力`);
        console.log(`\n脚本先执行日常任务，最后再执行内部互助\n助力码直接脚本获取，解决助力码过长问题\n助力已满和耗尽的号，会缓存至本地以过滤`);
        console.log(`============================================================`)
        resolve()
    })
}

async function requestGet(function_id, body = {}) {
    let h5st = ''
    let body_in = { ...body }
    if (!body_in.version) body_in.version = "9.0.0.1"
    if (!body_in.monitor_source) body_in.monitor_source = "plant_app_plant_index"
    if (!body_in.monitor_refer) body_in.monitor_refer = ""
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
        // h5st_body.appid = "wh5"
        h5st_body.appid = "ld"
    }
    return new Promise(async resolve => {
        await $.wait(2000);
        const option = {
            url: `${JD_API_HOST}?functionId=${function_id}&body=${(JSON.stringify(body_in))}&appid=${h5st_body.appid}&area=0_0_0_0&osVersion=&screen=414*896&networkType=&timestamp=${Date.now() - 5}&d_brand=&d_model=&wqDefault=false&client=${h5st_body.client}&clientVersion=${h5st_body.clientVersion}&partner=&build=&openudid=${h5st ? "&h5st=" + h5st : ""}`,
            headers: {
                'Cookie': cookie,
                'User-Agent': $.UA,
                "Accept": "*/*",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                "Connection": "keep-alive",
                "Host": "api.m.jd.com",
                "Referer": "https://plantearth.m.jd.com/"
            },
            timeout: 10000,
        };
        $.get(option, (err, resp, data) => {
            try {
                if (err) {
                    console.log('\n种豆得豆: API查询请求失败 ‼️‼️')
                    $.logErr(err);
                } else {
                    data = JSON.parse(data);
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve(data);
            }
        })
    })
}

function TotalBean() {
    return new Promise(async resolve => {
        const options = {
            "url": `https://wq.jd.com/user/info/QueryJDUserInfo?sceneval=2`,
            "headers": {
                "Accept": "application/json,text/plain, */*",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept-Encoding": "gzip, deflate, br",
                "Accept-Language": "zh-cn",
                "Connection": "keep-alive",
                "Cookie": cookie,
                "Referer": "https://wqs.jd.com/my/jingdou/my.shtml?sceneval=2",
                "User-Agent": $.UA
            },
            "timeout": 10000,
        }
        $.post(options, (err, resp, data) => {
            try {
                if (err) {
                    console.log(`TotalBean API请求失败 ${JSON.stringify(err)}`)
                } else {
                    if (data) {
                        data = JSON.parse(data);
                        if (data['retcode'] === 13) {
                            $.isLogin = false; //cookie过期
                            return
                        }
                        if (data['retcode'] === 0) {
                            $.nickName = (data['base'] && data['base'].nickname) || $.UserName;
                        } else {
                            $.nickName = $.UserName
                        }
                    } else {
                        console.log(`京东服务器返回空数据`)
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

function request(function_id, body = {}, timeout = 3000) {
    return new Promise(async resolve => {
        await $.wait(2000);
        const option = await taskUrl(function_id, body)
        setTimeout(() => {
            $.post(option, (err, resp, data) => {
                try {
                    if (err) {
                        console.log(`${function_id}: API查询请求失败 ‼️‼️ ${JSON.stringify(err)}`)
                    } else {
                        data = JSON.parse(data);
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

async function taskUrl(function_id, body) {
    let h5st = ''
    let body_in = { ...body }
    if (!body_in.version) body_in.version = "9.2.4.0"
    if (!body_in.monitor_source) body_in.monitor_source = "plant_app_plant_index"
    if (!body_in.monitor_refer) body_in.monitor_refer = ""
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
        // h5st_body.appid = "wh5"
        h5st_body.appid = "ld"
    }
    return {
        url: JD_API_HOST,
        body: `functionId=${function_id}&body=${(JSON.stringify(body_in))}&appid=${h5st_body.appid}&&area=0_0_0_0&osVersion=&screen=414*896&networkType=&timestamp=${Date.now() - 5}&d_brand=&d_model=&wqDefault=false&client=${h5st_body.client}&clientVersion=${h5st_body.clientVersion}&partner=&build=&openudid=${h5st ? "&h5st=" + h5st : ""}`,
        headers: {
            "Cookie": cookie,
            "User-Agent": $.UA,
            "Accept": "*/*",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
            "Connection": "keep-alive",
            "Host": "api.m.jd.com",
            "Referer": "https://plantearth.m.jd.com/"
        },
        timeout: 10000,
    }
}

async function getUA() {
    $.UA = `jdapp;iPhone;11.3.2;;;M/5.0;appBuild/168346;jdSupportDarkMode/0;ef/1;ep/${encodeURIComponent(JSON.stringify({ "ciphertype": 5, "cipher": { "ud": "", "sv": "CJGkCm==", "iad": "" }, "ts": 1668355995, "hdid": "JM9F1ywUPwflvMIpYPok0tt5k9kW4ArJEU3lfLhxBqw=", "version": "1.0.3", "appname": "com.360buy.jdmobile", "ridx": -1 }))};Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1;`
}

function getParam(url, name) {
    const reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i")
    const r = url.match(reg)
    if (r != null) return unescape(r[2]);
    return null;
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
