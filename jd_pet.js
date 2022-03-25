/*
东东萌宠
活动入口：京东APP我的-更多工具-东东萌宠
互助码shareCode请先手动运行脚本查看打印可看到
一天只能帮助5个人。多出的助力码无效
15 6-18/6 * * * jd_pet.js
annyooo 修改
*/

const $ = new Env('东东萌宠');
let cookiesArr = [], cookie = '', notify = '', allMessage = '';
let newShareCodes = [];
let message = '', subTitle = '', option = {};

const thefs = require('fs');
const thepath = '/jd/scripts/0sendNotify_Annyooo.js'
const notifyTip = $.isNode() ? process.env.MY_NOTIFYTIP : false;

let outpath = './Pet_HelpOut.json'
$.HelpOuts = { "thisDay": new Date().getDate(), "helpOut": [], "helpFull": [] }
$.Helptext = ""
$.helpJson = {}

if (thefs.existsSync(outpath)) $.Helptext = thefs.readFileSync(outpath, 'utf-8')
if ($.Helptext) $.helpJson = JSON.parse($.Helptext)
if (JSON.stringify($.helpJson) != "{}" && $.helpJson.thisDay && $.helpJson.thisDay == $.HelpOuts.thisDay) {
    if ($.helpJson.helpOut && $.helpJson.helpOut.length) for (let n of $.helpJson.helpOut) if ($.HelpOuts.helpOut.indexOf(n) == -1) $.HelpOuts.helpOut.push(n)
    if ($.helpJson.helpFull && $.helpJson.helpFull.length) for (let m of $.helpJson.helpFull) if ($.HelpOuts.helpFull.indexOf(m) == -1) $.HelpOuts.helpFull.push(m)
}

$.helpOut = $.HelpOuts.helpOut
$.helpFull = $.HelpOuts.helpFull

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

let jdNotify = false;//是否关闭通知，false打开通知推送，true关闭通知推送
const JD_API_HOST = 'https://api.m.jd.com/client.action';
let goodsUrl = '', taskInfoKey = [];


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
            goodsUrl = '';
            taskInfoKey = [];
            option = {};
            await jdPet();
            if ($.index % 5 == 0) {
                console.log(`\n\n***************** 每5个账号休息1分钟、已用时${parseInt((new Date().getTime() - $.theStart) / 1000)}秒 *****************`)
                await $.wait(parseInt(Math.random() * 5000 + 60000, 10))
            }
        }

        //if ($.isNode() && thefs.existsSync(thepath) && notifyTip && allMessage && $.ctrTemp){
        //    let thenotify = $.isNode() ? require(thepath) : '';
        //    await thenotify.sendNotify(`${$.name}`, `${allMessage}`)
        //}
    }

    console.log(`\n\n***************** 日常任务结束、已用时${parseInt((new Date().getTime() - $.theStart) / 1000)}秒 *****************`)

    if ($.helpFull.length) {
        for (let t of $.helpFull) {
            if (checkArr($.myCodes, t) > -1) $.myCodes.splice(checkArr($.myCodes, t), 1) // 剔除助力已满的助力码
            if (checkArr($.otherCodes, t) > -1) $.otherCodes.splice(checkArr($.otherCodes, t), 1) // 剔除助力已满的助力码
        }
    }

    console.log(`\n\n\n======================= 开始互助 =======================`);
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
                console.log("萌宠数据异常、不执行此账号. . .")
                continue
            }
            await shareCodesFormat();
            if (!newShareCodes.length) {
                console.log("已无账号需要助力，助力结束")
                break
            }
            await slaveHelp();//助力好友
            if ($.index % 5 == 0) {
                console.log(`\n\n***************** 每5个账号休息1分钟、已用时${parseInt((new Date().getTime() - $.theStart) / 1000)}秒 *****************\n`)
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
})()
    .catch((e) => {
        $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
        $.done();
    })

async function jdPet() {
    try {
        //查询jd宠物信息
        const initPetTownRes = await request('initPetTown');
        message = `【京东账号${$.index}】${$.nickName || $.UserName}\n`;
        if (initPetTownRes && initPetTownRes.result && initPetTownRes.code === '0' && initPetTownRes.resultCode === '0' && initPetTownRes.message === 'success') {
            $.petInfo = initPetTownRes.result;
            if ($.petInfo.userStatus === 0) {
                $.msg($.name, '', `【提示】京东账号${$.index} ${$.nickName}\n东东萌宠 活动未开启！\n请手动去京东APP开启活动\n入口：京东APP-我的-东东萌宠-开启`, { "open-url": "openapp.jdmoble://" });
                //$.log($.name, '', `【提示】京东账号${$.index} ${$.nickName}\n东东萌宠 活动未开启！\n请手动去京东APP开启活动\n入口：京东APP-我的-东东萌宠-开启`);

                if ($.isNode() && thefs.existsSync(thepath) && notifyTip) {
                    let thenotify = $.isNode() ? require(thepath) : '';
                    await thenotify.sendNotify(`${$.name} - ${$.index} - ${$.nickName}`, `【提示】京东账号${$.index} ${$.nickName}\n东东萌宠 活动未开启！\n请手动去京东APP开启活动\n入口：京东APP-我的-东东萌宠-开启`);
                }

                return
            }
            if (!$.petInfo.goodsInfo) {
                $.msg($.name, '', `【提示】京东账号${$.index} ${$.nickName}\n暂未选择商品，请手动选择\n入口：京东APP-我的-东东萌宠`, { "open-url": "openapp.jdmoble://" });
                if ($.isNode()) {
                    await notify.sendNotify(`${$.name} - ${$.index} - ${$.nickName}`, `【提示】京东账号${$.index} ${$.nickName}\n暂未选择商品，请手动选择\n入口：京东APP-我的-东东萌宠`);
                }

                if ($.isNode() && thefs.existsSync(thepath) && notifyTip) {
                    let thenotify = $.isNode() ? require(thepath) : '';
                    await thenotify.sendNotify(`${$.name} - ${$.index} - ${$.nickName}`, `【提示】京东账号${$.index} ${$.nickName}\n暂未选择商品，请手动选择\n入口：京东APP-我的-东东萌宠`);
                }

                return
            }
            goodsUrl = $.petInfo.goodsInfo && $.petInfo.goodsInfo.goodsUrl;
            // option['media-url'] = goodsUrl;
            // console.log(`初始化萌宠信息完成: ${JSON.stringify(petInfo)}`);
            if ($.petInfo.petStatus === 5) {
                option['open-url'] = "openApp.jdMobile://";
                $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】${$.petInfo.goodsInfo.goodsName}已可领取\n入口：京东APP-我的-东东萌宠`, option);
                if ($.isNode()) {
                    await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName || $.UserName}奖品已可领取`, `京东账号${$.index} ${$.nickName}\n${$.petInfo.goodsInfo.goodsName}已可领取\n入口：京东APP-我的-东东萌宠`);
                }

                if ($.isNode() && thefs.existsSync(thepath) && notifyTip) {
                    let thenotify = $.isNode() ? require(thepath) : '';
                    await thenotify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName || $.UserName}奖品已可领取`, `京东账号${$.index} ${$.nickName}\n${$.petInfo.goodsInfo.goodsName}已可领取\n入口：京东APP-我的-东东萌宠`);
                }

                return
            } else if ($.petInfo.petStatus === 6) {
                option['open-url'] = "openApp.jdMobile://";
                $.msg($.name, ``, `【京东账号${$.index}】${$.nickName || $.UserName}\n【提醒⏰】已领取红包,但未继续领养新的物品\n入口：京东APP-我的-东东萌宠`, option);
                if ($.isNode()) {
                    await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName || $.UserName}奖品已可领取`, `京东账号${$.index} ${$.nickName}\n已领取红包,但未继续领养新的物品\n入口：京东APP-我的-东东萌宠`);
                }

                if ($.isNode() && thefs.existsSync(thepath) && notifyTip) {
                    let thenotify = $.isNode() ? require(thepath) : '';
                    await thenotify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName || $.UserName}奖品已可领取`, `京东账号${$.index} ${$.nickName}\n已领取红包,但未继续领养新的物品\n入口：京东APP-我的-东东萌宠`);
                }

                return
            }

            $.thisCode = $.petInfo.shareCode
            console.log(`互助码:${$.thisCode}\n`);

            let thisarr = []
            thisarr.push($.index)
            thisarr.push($.thisCode)
            thisarr.push($.UserName)
            if (checkArr($.otherCodes, $.thisCode) == -1 && !$.myFronts.includes($.index)) $.otherCodes.push(thisarr)
            if (checkArr($.myCodes, $.thisCode) == -1 && $.myFronts.length > 0 && $.myFronts.includes($.index)) $.myCodes.push(thisarr)

            await taskInit();
            if (!$.taskInit || !$.taskInit.result || $.taskInit.resultCode === '9999') {
                console.log('初始化任务异常, 请稍后再试');
                return
            }
            $.taskInfo = $.taskInit.result;

            await petSport();//遛弯
            await masterHelpInit();//获取助力的信息
            await doTask();//做日常任务
            await feedPetsAgain();//再次投食
            await energyCollect();//收集好感度
            await showMsg();
            console.log('全部任务完成！');
        } else if (initPetTownRes.code === '0') {
            console.log(`初始化萌宠数据异常:  ${initPetTownRes.message || "未知"}`);
            if (!$.blackIndexs.includes($.index)) $.blackIndexs.push($.index)
        }
    } catch (e) {
        $.logErr(e)
        const errMsg = `京东账号${$.index} ${$.nickName || $.UserName}\n任务执行异常，请检查执行日志 ‼️‼️`;
        if ($.isNode()) await notify.sendNotify(`${$.name}`, errMsg);
        $.msg($.name, '', `${errMsg}`)
    }
}

// 收取所有好感度
async function energyCollect() {
    console.log('开始收取任务奖励好感度');
    let function_id = arguments.callee.name.toString();
    const response = await request(function_id);
    // console.log(`收取任务奖励好感度完成:${JSON.stringify(response)}`);
    if (response && response.resultCode === '0') {
        message += `【第${response.result.medalNum + 1}块勋章完成进度】${response.result.medalPercent}%，还需收集${response.result.needCollectEnergy}好感\n`;
        message += `【已获得勋章】${response.result.medalNum}块，还需收集${response.result.needCollectMedalNum}块即可兑换奖品“${$.petInfo.goodsInfo.goodsName}”\n`;
    }
}

//再次投食
async function feedPetsAgain() {
    const response = await request('initPetTown');//再次初始化萌宠
    if (response && response.code === '0' && response.resultCode === '0' && response.message === 'success') {
        $.petInfo = response.result;
        let foodAmount = $.petInfo.foodAmount; //剩余狗粮
        if (foodAmount - 100 >= 10) {
            for (let i = 0; i < parseInt((foodAmount - 100) / 10); i++) {
                const feedPetRes = await request('feedPets');
                console.log(`投食feedPetRes`);
                if (feedPetRes.resultCode == 0 && feedPetRes.code == 0) {
                    console.log('投食成功')
                }
            }
            const response2 = await request('initPetTown');
            $.petInfo = response2.result;
            subTitle = `【${$.petInfo.goodsInfo.goodsName}】`;
            // message += `【与爱宠相识】${$.petInfo.meetDays}天\n`;
            // message += `【剩余狗粮】${$.petInfo.foodAmount}g\n`;
        } else {
            console.log("目前剩余狗粮：【" + foodAmount + "】g,不再继续投食,保留部分狗粮用于完成第二天任务");
            subTitle = `【${$.petInfo.goodsInfo && $.petInfo.goodsInfo.goodsName}】`;
            // message += `【与爱宠相识】${$.petInfo.meetDays}天\n`;
            // message += `【剩余狗粮】${$.petInfo.foodAmount}g\n`;
        }
    } else {
        console.log(`初始化萌宠失败:  ${JSON.stringify($.petInfo)}`);
    }
}

async function doTask() {
    const { signInit, threeMealInit, firstFeedInit, feedReachInit, inviteFriendsInit, browseShopsInit, taskList } = $.taskInfo;
    for (let item of taskList) {
        if ($.taskInfo[item].finished) {
            console.log(`任务 ${item} 已完成`)
        }
    }
    //每日签到
    if (signInit && !signInit.finished) {
        await signInitFun();
    }
    // 首次喂食
    if (firstFeedInit && !firstFeedInit.finished) {
        await firstFeedInitFun();
    }
    // 三餐
    if (threeMealInit && !threeMealInit.finished) {
        if (threeMealInit.timeRange === -1) {
            console.log(`未到三餐时间`);
        } else {
            await threeMealInitFun();
        }
    }
    if (browseShopsInit && !browseShopsInit.finished) {
        await browseShopsInitFun();
    }
    let browseSingleShopInitList = [];
    taskList.map((item) => {
        if (item.indexOf('browseSingleShopInit') > -1) {
            browseSingleShopInitList.push(item);
        }
    });
    // 去逛逛好货会场
    for (let item of browseSingleShopInitList) {
        const browseSingleShopInitTask = $.taskInfo[item];
        if (browseSingleShopInitTask && !browseSingleShopInitTask.finished) {
            await browseSingleShopInit(browseSingleShopInitTask);
        }
    }
    if (inviteFriendsInit && !inviteFriendsInit.finished) {
        await inviteFriendsInitFun();
    }
    // 投食10次
    if (feedReachInit && !feedReachInit.finished) {
        await feedReachInitFun();
    }
}

// 好友助力信息
async function masterHelpInit() {
    let res = await request(arguments.callee.name.toString());
    // console.log(`助力信息: ${JSON.stringify(res)}`);
    if (res && res.code === '0' && res.resultCode === '0') {
        if (res.result.masterHelpPeoples && res.result.masterHelpPeoples.length >= 5) {
            if (!res.result.addedBonusFlag) {
                console.log("开始领取额外奖励");
                let getHelpAddedBonusResult = await request('getHelpAddedBonus');
                if (getHelpAddedBonusResult.resultCode === '0') {
                    message += `【额外奖励${getHelpAddedBonusResult.result.reward}领取】${getHelpAddedBonusResult.message}\n`;
                }
                console.log(`领取30g额外奖励结果：【${getHelpAddedBonusResult.message}】`);
            } else {
                console.log("已经领取过5好友助力额外奖励");
                message += `【额外奖励】已领取\n`;
            }
        } else {
            console.log("助力好友未达到5个")
            message += `【额外奖励】领取失败，原因：给您助力的人未达5个\n`;
        }
        if (res.result.masterHelpPeoples && res.result.masterHelpPeoples.length > 0) {
            console.log('帮您助力的好友的名单开始')
            let str = '';
            res.result.masterHelpPeoples.map((item, index) => {
                if (index === (res.result.masterHelpPeoples.length - 1)) {
                    str += item.nickName || "匿名用户";
                } else {
                    str += (item.nickName || "匿名用户") + '，';
                }
            })
            message += `【助力您的好友】${str}\n`;
        }
    }
}

/**
 * 助力好友, 暂时支持一个好友, 需要拿到shareCode
 * shareCode为你要助力的好友的
 * 运行脚本时你自己的shareCode会在控制台输出, 可以将其分享给他人
 */

async function slaveHelp() {
    //$.log(`\n因1.6日好友助力功能下线。故暂时屏蔽\n`)
    //return
    let helpPeoples = '';
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

        let response = await request(arguments.callee.name.toString(), { 'shareCode': code });
        if (!response) return
        if (response && response.code === '0' && response.resultCode === '0') {
            if (response.result.helpStatus === 0) {
                console.log(`助力好友【${response.result.masterNickName || $.theName}】成功\n`);
                helpPeoples += response.result.masterNickName + '，';
            } else if (response.result.helpStatus === 1) {
                // 您今天助力次数已耗尽
                console.log(`助力好友【${response.result.masterNickName || $.theName}】失败，您今天助力次数已耗尽\n`);
                if (!$.helpRunout.includes($.index)) $.helpRunout.push($.index)
                if ($.HelpOuts.helpOut.indexOf($.UserName) == -1) $.HelpOuts.helpOut.push($.UserName)
                break;
            } else if (response.result.helpStatus === 2) {
                //该好友已满5人助力，无需您再次助力
                console.log(`该好友【${response.result.masterNickName || $.theName}】已满5人助力，无需您再次助力\n`);
                if (checkArr($.myCodes, code) > -1) $.myCodes.splice(checkArr($.myCodes, code), 1) // 剔除助力已满的助力码
                if (checkArr($.otherCodes, code) > -1) $.otherCodes.splice(checkArr($.otherCodes, code), 1) // 剔除助力已满的助力码
                if ($.HelpOuts.helpFull.indexOf($.theName) == -1) $.HelpOuts.helpFull.push($.theName)
            } else {
                console.log(`助力其他情况：${JSON.stringify(response)}\n`);
            }
        } else {
            console.log(`助力好友结果: ${response.message}\n`);
        }
    }

    if (helpPeoples && helpPeoples.length > 0) {
        message += `【您助力的好友】${helpPeoples.substr(0, helpPeoples.length - 1)}\n`;
    }
}

// 遛狗, 每天次数上限10次, 随机给狗粮, 每次遛狗结束需调用getSportReward领取奖励, 才能进行下一次遛狗
async function petSport() {
    console.log('开始遛弯');
    let times = 1
    const code = 0
    let resultCode = 0
    do {
        let response = await request(arguments.callee.name.toString())
        if (!response) continue
        console.log(`第${times}次遛狗完成: ${JSON.stringify(response)}`);
        resultCode = response.resultCode;
        if (resultCode == 0) {
            let sportRevardResult = await request('getSportReward');
            console.log(`领取遛狗奖励完成: ${JSON.stringify(sportRevardResult)}`);
        }
        times++;
    } while (resultCode == 0 && code == 0)
    if (times > 1) {
        // message += '【十次遛狗】已完成\n';
    }
}

// 初始化任务, 可查询任务完成情况
async function taskInit() {
    console.log('开始任务初始化');
    $.taskInit = await request(arguments.callee.name.toString(), { "version": 1 });
}

// 每日签到, 每天一次
async function signInitFun() {
    console.log('准备每日签到');
    const response = await request("getSignReward");
    if (!response) return
    console.log(`每日签到结果: ${JSON.stringify(response)}`);
    if (response.code === '0' && response.resultCode === '0') {
        console.log(`【每日签到成功】奖励${response.result.signReward}g狗粮\n`);
        // message += `【每日签到成功】奖励${response.result.signReward}g狗粮\n`;
    } else {
        console.log(`【每日签到】${response.message}\n`);
        // message += `【每日签到】${response.message}\n`;
    }
}

// 三餐签到, 每天三段签到时间
async function threeMealInitFun() {
    console.log('准备三餐签到');
    const response = await request("getThreeMealReward");
    if (!response) return
    console.log(`三餐签到结果: ${JSON.stringify(response)}`);
    if (response.code === '0' && response.resultCode === '0') {
        console.log(`【定时领狗粮】获得${response.result.threeMealReward}g\n`);
        // message += `【定时领狗粮】获得${response.result.threeMealReward}g\n`;
    } else {
        console.log(`【定时领狗粮】${response.message}\n`);
        // message += `【定时领狗粮】${response.message}\n`;
    }
}

// 浏览指定店铺 任务
async function browseSingleShopInit(item) {
    console.log(`开始做 ${item.title} 任务， ${item.desc}`);
    const body = { "index": item['index'], "version": 1, "type": 1 };
    const body2 = { "index": item['index'], "version": 1, "type": 2 };
    const response = await request("getSingleShopReward", body);
    if (!response) return
    // console.log(`点击进去response::${JSON.stringify(response)}`);
    if (response.code === '0' && response.resultCode === '0') {
        const response2 = await request("getSingleShopReward", body2);
        // console.log(`浏览完毕领取奖励:response2::${JSON.stringify(response2)}`);
        if (response2.code === '0' && response2.resultCode === '0') {
            console.log(`【浏览指定店铺】获取${response2.result.reward}g\n`);
            // message += `【浏览指定店铺】获取${response2.result.reward}g\n`;
        }
    }
}

// 浏览店铺任务, 任务可能为多个? 目前只有一个
async function browseShopsInitFun() {
    console.log('开始浏览店铺任务');
    let times = 0;
    let resultCode = 0;
    let code = 0;
    do {
        let response = await request("getBrowseShopsReward");
        if (!response) continue
        console.log(`第${times}次浏览店铺结果: ${JSON.stringify(response)}`);
        code = response.code;
        resultCode = response.resultCode;
        times++;
    } while (resultCode == 0 && code == 0 && times < 5)
    console.log('浏览店铺任务结束');
}

// 首次投食 任务
function firstFeedInitFun() {
    console.log('首次投食任务合并到10次喂食任务中\n');
}

// 邀请新用户
async function inviteFriendsInitFun() {
    console.log('邀请新用户功能未实现');
    if ($.taskInfo.inviteFriendsInit && $.taskInfo.inviteFriendsInit.status == 1 && $.taskInfo.inviteFriendsInit.inviteFriendsNum > 0) {
        // 如果有邀请过新用户,自动领取60gg奖励
        const res = await request('getInviteFriendsReward');
        if (res.code == 0 && res.resultCode == 0) {
            console.log(`领取邀请新用户奖励成功,获得狗粮现有狗粮${$.taskInfo.inviteFriendsInit.reward}g，${res.result.foodAmount}g`);
            message += `【邀请新用户】获取狗粮${$.taskInfo.inviteFriendsInit.reward}g\n`;
        }
    }
}

/**
 * 投食10次 任务
 */
async function feedReachInitFun() {
    console.log('投食任务开始...');
    let finishedTimes = $.taskInfo.feedReachInit.hadFeedAmount / 10; //已经喂养了几次
    let needFeedTimes = 10 - finishedTimes; //还需要几次
    let tryTimes = 20; //尝试次数
    do {
        console.log(`还需要投食${needFeedTimes}次`);
        const response = await request('feedPets');
        if (!response) continue
        console.log(`本次投食结果: ${JSON.stringify(response)}`);
        if (response.resultCode == 0 && response.code == 0) {
            needFeedTimes--;
        }
        if (response.resultCode == 3003 && response.code == 0) {
            console.log('剩余狗粮不足, 投食结束');
            needFeedTimes = 0;
        }
        tryTimes--;
    } while (needFeedTimes > 0 && tryTimes > 0)
    console.log('投食任务结束...\n');
}

async function showMsg() {
    if ($.isNode() && process.env.PET_NOTIFY_CONTROL) {
        $.ctrTemp = `${process.env.PET_NOTIFY_CONTROL}` === 'false';
    } else if ($.getdata('jdPetNotify')) {
        $.ctrTemp = $.getdata('jdPetNotify') === 'false';
    } else {
        $.ctrTemp = `${jdNotify}` === 'false';
    }
    // jdNotify = `${notify.petNotifyControl}` === 'false' && `${jdNotify}` === 'false' && $.getdata('jdPetNotify') === 'false';
    if ($.ctrTemp) {
        $.msg($.name, subTitle, message, option);
        if ($.isNode()) {
            allMessage += `${subTitle}\n${message}${$.index !== cookiesArr.length ? '\n\n' : ''}`
            // await notify.sendNotify(`${$.name} - 账号${$.index} - ${$.nickName}`, `${subTitle}\n${message}`);
        }
    } else {
        $.log(`\n${message}\n`);
    }
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
        // console.log('开始获取东东萌宠配置文件\n')
        notify = $.isNode() ? require('./sendNotify') : '';
        //Node.js用户请在jdCookie.js处填写京东ck;
        const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
        const jdPetShareCodes = $.isNode() ? require('./jdPetShareCodes.js') : '';
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
                "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
            }
        }
        $.post(options, (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
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

// 请求
async function request(function_id, body = {}) {
    await $.wait(3000); //歇口气儿, 不然会报操作频繁
    return new Promise((resolve, reject) => {
        $.post(taskUrl(function_id, body), (err, resp, data) => {
            try {
                if (err) {
                    console.log('\n东东萌宠: API查询请求失败 ‼️‼️');
                    console.log(JSON.stringify(err));
                    // $.logErr(err);
                } else {
                    data = JSON.parse(data);
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve(data)
            }
        })
    })
}

// function taskUrl(function_id, body = {}) {
//   return {
//     url: `${JD_API_HOST}?functionId=${function_id}&appid=wh5&loginWQBiz=pet-town&body=${escape(JSON.stringify(body))}`,
//     headers: {
//       Cookie: cookie,
//       UserAgent: $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
//     }
//   };
// }

function taskUrl(function_id, body = {}) {
    body["version"] = 2;
    body["channel"] = 'app';
    return {
        url: `${JD_API_HOST}?functionId=${function_id}`,
        body: `body=${escape(JSON.stringify(body))}&appid=wh5&loginWQBiz=pet-town&clientVersion=9.0.4`,
        headers: {
            'Cookie': cookie,
            'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
            'Host': 'api.m.jd.com',
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    };
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

// prettier-ignore
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
