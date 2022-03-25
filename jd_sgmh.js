/*
闪购盲盒
长期活动，一人每天5次助力机会，10次被助机会，被助力一次获得一次抽奖机会，前几次必中京豆
修改自 @yangtingxiao 抽奖机脚本
活动入口：京东APP首页-闪购-闪购盲盒
网页地址：https://h5.m.jd.com/babelDiy/Zeus/3vzA7uGuWL2QeJ5UeecbbAVKXftQ/index.html
20 8,22 * * * jd_sgmh.js
annyooo 修改
*/

const $ = new Env('闪购盲盒');
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
let appId = '1EFRXxg', homeDataFunPrefix = 'interact_template', collectScoreFunPrefix = 'harmony', message = ''
let lotteryResultFunPrefix = homeDataFunPrefix, browseTime = 6
let newShareCodes = []

const notify = $.isNode() ? require('./sendNotify') : '';


const thefs = require('fs');
let outpath = './Sgmh_HelpOut.json'
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

//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '';
if ($.isNode()) {
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item])
    })
    if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
} else {
    cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}

const JD_API_HOST = `https://api.m.jd.com/client.action`;

!(async () => {
    if (!cookiesArr[0]) {
        $.msg($.name, '【提示】请先获取cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/', { "open-url": "https://bean.m.jd.com/" });
        return;
    }
    $.theStart = new Date().getTime()

    await requireConfig();
    for (let i = 0; i < cookiesArr.length; i++) {
        cookie = cookiesArr[i];
        if (cookie) {
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            $.isLogin = true;
            $.nickName = '';
            await TotalBean();
            console.log(`\n*********开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
            if (!$.isLogin) {
                console.log("Cookie已失效. . .")
                $.unLogins.push($.index)

                if ($.isNode()) {
                    await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
                }
                continue
            }
            await getTheCodes();
        }
    }

    console.log(`\n\n\n======================= 开始互助 =======================`);
    $.helpTimes = 0
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
                console.log("账号火爆、不执行此账号. . .")
                continue
            }
            await shareCodesFormat();
            if (!newShareCodes.length) {
                console.log("已无账号需要助力，助力结束")
                break
            }
            $.helpTimes = $.helpTimes + 1
            await helpFriends()
            // if ($.helpTimes % 5 == 0) {
            //     console.log(`\n\n***************** 每请求5个账号休息1分钟、已用时${parseInt((new Date().getTime() - $.theStart) / 1000)}秒 *****************`)
            //     await $.wait(parseInt(Math.random() * 5000 + 60000, 10))
            // }
        }
    }


    thefs.writeFile(outpath, JSON.stringify($.HelpOuts), function (err) {
        if (err) console.log(`\n\n写入缓存失败：${err}`)
        else console.log("\n\n写入缓存成功 . . .")
    })
    await $.wait(1000)


    console.log(`\n\n\n======================= 开始日常 =======================`);

    for (let i = 0; i < cookiesArr.length; i++) {
        cookie = cookiesArr[i];
        if (cookie) {
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            $.isLogin = true;
            $.nickName = '';
            $.beans = 0
            message = ''
            await TotalBean();
            console.log(`\n\n*********开始【京东账号${$.index}】${$.nickName || $.UserName}*********`);
            if ($.unLogins.includes($.index)) {
                console.log("Cookie已失效. . .")
                continue
            }
            await interact_template_getHomeData()
            await showMsg();
        }
    }
})()
    .catch((e) => $.logErr(e))
    .finally(() => $.done())

//获取活动信息
function interact_template_getHomeData(timeout = 0) {
    return new Promise((resolve) => {
        setTimeout(() => {
            let url = {
                url: `${JD_API_HOST}`,
                headers: {
                    'Origin': `https://h5.m.jd.com`,
                    'Cookie': cookie,
                    'Connection': `keep-alive`,
                    'Accept': `application/json, text/plain, */*`,
                    'Referer': `https://h5.m.jd.com/babelDiy/Zeus/2WBcKYkn8viyxv7MoKKgfzmu7Dss/index.html`,
                    'Host': `api.m.jd.com`,
                    'Accept-Encoding': `gzip, deflate, br`,
                    'Accept-Language': `zh-cn`
                },
                body: `functionId=${homeDataFunPrefix}_getHomeData&body={"appId":"${appId}","taskToken":""}&client=wh5&clientVersion=1.0.0`
            }

            $.post(url, async (err, resp, data) => {
                try {
                    data = JSON.parse(data);
                    if (data.data.bizCode !== 0) {
                        console.log(data.data.bizMsg);
                        return
                    }
                    scorePerLottery = data.data.result.userInfo.scorePerLottery || data.data.result.userInfo.lotteryMinusScore
                    if (data.data.result.raiseInfo && data.data.result.raiseInfo.levelList) scorePerLottery = data.data.result.raiseInfo.levelList[data.data.result.raiseInfo.scoreLevel];
                    //console.log(scorePerLottery)
                    for (let i = 0; i < data.data.result.taskVos.length; i++) {
                        console.log("\n" + data.data.result.taskVos[i].taskType + '-' + data.data.result.taskVos[i].taskName + '-' + (data.data.result.taskVos[i].status === 1 ? `已完成${data.data.result.taskVos[i].times}-未完成${data.data.result.taskVos[i].maxTimes}` : "全部已完成"))
                        //签到
                        if (data.data.result.taskVos[i].taskName === '邀请好友助力') {
                        }
                        else if (data.data.result.taskVos[i].status === 3) {
                            console.log('开始抽奖')
                            await interact_template_getLotteryResult(data.data.result.taskVos[i].taskId);
                        }
                        else if ([0, 13].includes(data.data.result.taskVos[i].taskType)) {
                            if (data.data.result.taskVos[i].status === 1) {
                                await harmony_collectScore(data.data.result.taskVos[i].simpleRecordInfoVo.taskToken, data.data.result.taskVos[i].taskId);
                            }
                        }
                        else if ([14, 6].includes(data.data.result.taskVos[i].taskType)) {
                            //console.log(data.data.result.taskVos[i].assistTaskDetailVo.taskToken)
                            for (let j = 0; j < (data.data.result.userInfo.lotteryNum || 0); j++) {
                                if (appId === "1EFRTxQ") {
                                    await ts_smashGoldenEggs()
                                } else {
                                    await interact_template_getLotteryResult(data.data.result.taskVos[i].taskId);
                                }
                            }
                        }
                        let list = data.data.result.taskVos[i].productInfoVos || data.data.result.taskVos[i].followShopVo || data.data.result.taskVos[i].shoppingActivityVos || data.data.result.taskVos[i].browseShopVo
                        for (let k = data.data.result.taskVos[i].times; k < data.data.result.taskVos[i].maxTimes; k++) {
                            for (let j in list) {
                                if (list[j].status === 1) {
                                    //console.log(list[j].simpleRecordInfoVo||list[j].assistTaskDetailVo)
                                    console.log("\n" + (list[j].title || list[j].shopName || list[j].skuName))
                                    //console.log(list[j].itemId)
                                    if (list[j].itemId) {
                                        await harmony_collectScore(list[j].taskToken, data.data.result.taskVos[i].taskId, list[j].itemId, 1);
                                        if (k === data.data.result.taskVos[i].maxTimes - 1) await interact_template_getLotteryResult(data.data.result.taskVos[i].taskId);
                                    } else {
                                        await harmony_collectScore(list[j].taskToken, data.data.result.taskVos[i].taskId)
                                    }
                                    list[j].status = 2;
                                    break;
                                }
                            }
                        }
                    }
                    if (scorePerLottery) await interact_template_getLotteryResult();
                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve()
                }
            })
        }, timeout)
    })
}

//获取互助码
function getTheCodes(timeout = 0) {
    return new Promise((resolve) => {
        setTimeout(() => {
            let url = {
                url: `${JD_API_HOST}`,
                headers: {
                    'Origin': `https://h5.m.jd.com`,
                    'Cookie': cookie,
                    'Connection': `keep-alive`,
                    'Accept': `application/json, text/plain, */*`,
                    'Referer': `https://h5.m.jd.com/babelDiy/Zeus/2WBcKYkn8viyxv7MoKKgfzmu7Dss/index.html`,
                    'Host': `api.m.jd.com`,
                    'Accept-Encoding': `gzip, deflate, br`,
                    'Accept-Language': `zh-cn`
                },
                body: `functionId=${homeDataFunPrefix}_getHomeData&body={"appId":"${appId}","taskToken":""}&client=wh5&clientVersion=1.0.0`
            }
            $.post(url, async (err, resp, data) => {
                try {
                    data = JSON.parse(data);
                    if (data.data && data.data.bizCode !== 0) {
                        console.log(data.data.bizMsg);
                        return
                    }
                    if (data?.data?.result?.taskVos) {
                        for (let i = 0; i < data.data.result.taskVos.length; i++) {
                            if (data.data.result.taskVos[i].taskName && data.data.result.taskVos[i].taskName === '邀请好友助力') {
                                $.thisCode = data.data.result.taskVos[i].assistTaskDetailVo.taskToken || ""
                                if ($.thisCode) {
                                    $.theTaskId = data.data.result.taskVos[i].taskId
                                    console.log(`互助码:${$.thisCode}`);
                                    let thisarr = []
                                    thisarr.push($.index)
                                    thisarr.push($.thisCode)
                                    thisarr.push($.UserName)
                                    if (checkArr($.otherCodes, $.thisCode) == -1 && !$.myFronts.includes($.index)) $.otherCodes.push(thisarr)
                                    if (checkArr($.myCodes, $.thisCode) == -1 && $.myFronts.length > 0 && $.myFronts.includes($.index)) $.myCodes.push(thisarr)
                                }
                            }
                        }
                    } else if (data && data.msg && data.msg == "登陆失败") {
                        console.log("Cookie已失效. . .")
                        if (!$.unLogins.includes($.index)) $.unLogins.push($.index)
                    } else console.log(`打印data: ${JSON.stringify(data)}`);

                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve()
                }
            })
        }, timeout)
    })
}

async function helpFriends() {
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
        let res = await doHelp(code, $.theTaskId)
        if (res) {

            console.log(`打印助力结果：${res?.data?.bizMsg ?? JSON.stringify(res)}`)

            if (res?.data?.bizMsg && res.data.bizMsg.indexOf("success") > -1) {
                console.log(`助力好友【${$.theName}】成功\n`)
            } else if (res?.data?.bizMsg && res.data.bizMsg.indexOf("助力已满员") > -1) {
                console.log(`助力好友【${$.theName}】结果：好友助力已满\n`)
                if (checkArr($.myCodes, code) > -1) $.myCodes.splice(checkArr($.myCodes, code), 1) // 剔除助力已满的助力码
                if (checkArr($.otherCodes, code) > -1) $.otherCodes.splice(checkArr($.otherCodes, code), 1) // 剔除助力已满的助力码
                if ($.HelpOuts.helpFull.indexOf($.theName) == -1) $.HelpOuts.helpFull.push($.theName)
            } else if (res?.data?.bizMsg && res.data.bizMsg.indexOf("已达到助力上限") > -1) {
                console.log(`助力好友【${$.theName}】结果：助力次数耗尽，跳出\n`)
                if (!$.helpRunout.includes($.index)) $.helpRunout.push($.index)
                if ($.HelpOuts.helpOut.indexOf($.UserName) == -1) $.HelpOuts.helpOut.push($.UserName)
                break
            } else {
                console.log(`助力好友【${$.theName}】失败：`, res?.data?.bizMsg ?? JSON.stringify(res))
            }
            await $.wait(1000)
        }
    }
}

function doHelp(taskToken, taskId, itemId = "", actionType = 0) {
    return new Promise(resolve => {
        let url = {
            url: `${JD_API_HOST}`,
            headers: {
                'Origin': `https://h5.m.jd.com`,
                'Cookie': cookie,
                'Connection': `keep-alive`,
                'Accept': `application/json, text/plain, */*`,
                'Referer': `https://h5.m.jd.com/babelDiy/Zeus/2WBcKYkn8viyxv7MoKKgfzmu7Dss/index.html`,//?inviteId=P225KkcRx4b8lbWJU72wvZZcwCjVXmYaS5jQ P225KkcRx4b8lbWJU72wvZZcwCjVXmYaS5jQ?inviteId=${shareCode}
                'Host': `api.m.jd.com`,
                'Accept-Encoding': `gzip, deflate, br`,
                'Accept-Language': `zh-cn`
            },
            body: `functionId=${collectScoreFunPrefix}_collectScore&body={"appId":"${appId}","taskToken":"${taskToken}","taskId":${taskId}${itemId ? ',"itemId":"' + itemId + '"' : ''},"actionType":${actionType}&client=wh5&clientVersion=1.0.0`
        }
        $.post(url, async (err, resp, data) => {
            try {
                if (safeGet(data)) {
                    data = $.toObj(data)
                }
            } catch (e) {
                console.log(e)
            } finally {
                resolve(data)
            }
        })
    })
}


//做任务
function harmony_collectScore(taskToken, taskId, itemId = "", actionType = 0, timeout = 0) {
    return new Promise((resolve) => {
        setTimeout(() => {
            let url = {
                url: `${JD_API_HOST}`,
                headers: {
                    'Origin': `https://h5.m.jd.com`,
                    'Cookie': cookie,
                    'Connection': `keep-alive`,
                    'Accept': `application/json, text/plain, */*`,
                    'Referer': `https://h5.m.jd.com/babelDiy/Zeus/2WBcKYkn8viyxv7MoKKgfzmu7Dss/index.html`,//?inviteId=P225KkcRx4b8lbWJU72wvZZcwCjVXmYaS5jQ P225KkcRx4b8lbWJU72wvZZcwCjVXmYaS5jQ?inviteId=${shareCode}
                    'Host': `api.m.jd.com`,
                    'Accept-Encoding': `gzip, deflate, br`,
                    'Accept-Language': `zh-cn`
                },
                body: `functionId=${collectScoreFunPrefix}_collectScore&body={"appId":"${appId}","taskToken":"${taskToken}","taskId":${taskId}${itemId ? ',"itemId":"' + itemId + '"' : ''},"actionType":${actionType}&client=wh5&clientVersion=1.0.0`
            }
            //console.log(url.body)
            //if (appId === "1EFRTxQ") url.body += "&appid=golden-egg"
            $.post(url, async (err, resp, data) => {
                try {
                    data = JSON.parse(data);
                    if (data && data.data && data.data.bizMsg === "任务领取成功") {
                        await harmony_collectScore(taskToken, taskId, itemId, 0, parseInt(browseTime) * 1000);
                    } else {
                        console.log(data.data.bizMsg || JSON.stringify(data))
                    }
                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve()
                }
            })
        }, timeout)
    })
}

//抽奖
function interact_template_getLotteryResult(taskId, timeout = 0) {
    return new Promise((resolve) => {
        setTimeout(() => {
            let url = {
                url: `${JD_API_HOST}`,
                headers: {
                    'Origin': `https://h5.m.jd.com`,
                    'Cookie': cookie,
                    'Connection': `keep-alive`,
                    'Accept': `application/json, text/plain, */*`,
                    'Referer': `https://h5.m.jd.com/babelDiy/Zeus/2WBcKYkn8viyxv7MoKKgfzmu7Dss/index.html?inviteId=P04z54XCjVXmYaW5m9cZ2f433tIlGBj3JnLHD0`,//?inviteId=P225KkcRx4b8lbWJU72wvZZcwCjVXmYaS5jQ P225KkcRx4b8lbWJU72wvZZcwCjVXmYaS5jQ
                    'Host': `api.m.jd.com`,
                    'Accept-Encoding': `gzip, deflate, br`,
                    'Accept-Language': `zh-cn`
                },
                body: `functionId=${lotteryResultFunPrefix}_getLotteryResult&body={"appId":"${appId}"${taskId ? ',"taskId":"' + taskId + '"' : ''}}&client=wh5&clientVersion=1.0.0`
            }
            //console.log(url.body)
            //if (appId === "1EFRTxQ") url.body = `functionId=ts_getLottery&body={"appId":"${appId}"${taskId ? ',"taskId":"'+taskId+'"' : ''}}&client=wh5&clientVersion=1.0.0&appid=golden-egg`
            $.post(url, async (err, resp, data) => {
                try {
                    if (!timeout) console.log('\n开始抽奖')
                    data = JSON.parse(data);
                    if (data.data.bizCode === 0) {
                        if (data.data.result.userAwardsCacheDto.jBeanAwardVo) {
                            console.log('京豆:' + data.data.result.userAwardsCacheDto.jBeanAwardVo.quantity)
                            $.beans += parseInt(data.data.result.userAwardsCacheDto.jBeanAwardVo.quantity)
                        }
                        if (data.data.result.raiseInfo) scorePerLottery = parseInt(data.data.result.raiseInfo.nextLevelScore);
                        if (parseInt(data.data.result.userScore) >= scorePerLottery && scorePerLottery) {
                            await interact_template_getLotteryResult(1000)
                        }
                    }
                } catch (e) {
                    $.logErr(e, resp);
                } finally {
                    resolve()
                }
            })
        }, timeout)
    })
}


//通知
function showMsg() {
    message += `任务已完成，本次运行获得京豆${$.beans}`
    return new Promise(resolve => {
        if ($.beans) $.msg($.name, '', `【京东账号${$.index}】${$.nickName}\n${message}`);
        $.log(`\n【京东账号${$.index}】${$.nickName}\n${message}`);
        resolve()
    })
}

function requireConfig() {
    return new Promise(async resolve => {
        console.log(`共${cookiesArr.length}个京东账号\n\n============================================================`)
        console.log(`你的互助配置如下：\n互助模式：${helpRandom + "" === "true" ? '随机互助' : '顺序互助'}\n优先被助力账号：${$.myFronts.length > 0 ? $.myFronts.toString() : '未设定'}`);
        console.log(`\n环境变量设置提示：\nexport jd_helpFronts="1,2,3-5" 表示账号12345固定优先被助力\nexport jd_helpRandom="true" 表示固定助力过后全部随机助力、反之顺序助力`);
        console.log(`\n脚本先执行日常任务，最后再执行内部互助\n助力码直接脚本获取，解决助力码过长问题\n助力已满和耗尽的号，会缓存至本地以过滤`);
        console.log(`============================================================\n`)
        resolve()
    })
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
                "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1") : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
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

function Env(t, e) { class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `\ud83d\udd14${this.name}, \u5f00\u59cb!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), a = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(a, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t) { let e = { "M+": (new Date).getMonth() + 1, "d+": (new Date).getDate(), "H+": (new Date).getHours(), "m+": (new Date).getMinutes(), "s+": (new Date).getSeconds(), "q+": Math.floor(((new Date).getMonth() + 3) / 3), S: (new Date).getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, ((new Date).getFullYear() + "").substr(4 - RegExp.$1.length))); for (let s in e) new RegExp("(" + s + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? e[s] : ("00" + e[s]).substr(("" + e[s]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))); let h = ["", "==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="]; h.push(e), s && h.push(s), i && h.push(i), console.log(h.join("\n")), this.logs = this.logs.concat(h) } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t.stack) : this.log("", `\u2757\ufe0f${this.name}, \u9519\u8bef!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
