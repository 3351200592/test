/*
东东健康社区
更新时间：2021-4-22
活动入口：京东APP首页搜索 "玩一玩"即可
13 1,6,22 * * * jd_health.js
annyooo 修改
*/

const $ = new Env("东东健康社区");
const jdCookieNode = $.isNode() ? require("./jdCookie.js") : "";
const notify = $.isNode() ? require('./sendNotify') : "";
let cookiesArr = [], cookie = "", allMessage = "", message;
let newShareCodes = [];

let reward = process.env.JD_HEALTH_REWARD_NAME ? process.env.JD_HEALTH_REWARD_NAME : ''

const thefs = require('fs');
let outpath = './Health_HelpOut.json'
$.HelpOuts = { "thisDay": new Date().getDate(), "helpOut": [], "helpFull": [] }
$.Helptext = ""
$.helpJson = {}
$.unLogins = []
$.otherCodes = []
$.myCodes = []
$.myFronts = []
$.helpRunout = []
$.blackIndexs = []

let taskList = []
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


if ($.isNode()) {
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item]);
    });
    // console.log(`如果出现提示 ?.data. 错误，请升级nodejs版本(进入容器后，apk add nodejs-current)`)
    if (process.env.JD_DEBUG && process.env.JD_DEBUG === "false") console.log = () => { };
} else {
    cookiesArr = [$.getdata("CookieJD"), $.getdata("CookieJD2"), ...$.toObj($.getdata("CookiesJD") || "[]").map((item) => item.cookie)].filter((item) => !!item);
}

const JD_API_HOST = "https://api.m.jd.com/";

!(async () => {
    if (!cookiesArr[0]) {
        $.msg($.name, "【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取", "https://bean.m.jd.com/", { "open-url": "https://bean.m.jd.com/" });
        return;
    }
    $.theStart = new Date().getTime()

    await requireConfig()
    for (let i = 0; i < cookiesArr.length; i++) {
        if (cookiesArr[i]) {
            cookie = cookiesArr[i];
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]);
            $.index = i + 1;
            message = "";
            $.isLogin = true;
            $.nickName = '';
            await TotalBean();
            console.log(`\n\n开始【京东账号${$.index}】${$.nickName || $.UserName}\n`);
            if (!$.isLogin) {
                console.log("Cookie已失效. . .")
                $.unLogins.push($.index)
                continue
            }
            await main()
            await showMsg()
        }
    }

    await getCodesCache()

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
        if (err) console.log(`\n\n写入缓存失败：${err}\n`)
        else console.log("\n\n写入缓存成功 . . .\n")
    })
    await $.wait(1000)

    if ($.isNode() && allMessage) {
        await notify.sendNotify(`${$.name}`, `${allMessage}`)
    }
})()
    .catch((e) => {
        $.log("", `❌ ${$.name}, 失败! 原因: ${e}!`, "");
    })
    .finally(() => {
        $.done();
    });

async function main() {
    try {
        $.score = 0
        $.earn = false
        $.isHuobao = false
        taskList = []
        await getTaskDetail(-1)
        if ($.isHuobao) return
        await getTaskDetail(16) //签到
        await getTaskDetail(6)  //助力
        //日常任务
        for (let i = 0; i < taskList.length; i++) {
            // $.canDo = false
            if (taskList[i].status) {
                await getTaskDetail(taskList[i].taskId)
            } else console.log(`今天没有${taskList[i].taskName}这个任务`)
            // if (!$.canDo) break
            await $.wait(1000)
        }
        await collectScore()
        if (reward) await getCommodities()
        await doLottery()
        await getTaskDetail(-1) //获取本次任务获得健康值

    } catch (e) {
        $.logErr(e)
    }
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
        let res = await doTask(code, 6, 99)
        if (res) {
            if ([0, 1].includes(res?.data?.bizCode ?? -1)) {
                if (res?.data?.result?.score) console.log(`助力好友【${$.theName}】成功，获得：${res?.data?.result?.score ?? '未知'}能量\n`)
                else console.log(`助力好友【${$.theName}】成功，领取结果：${res?.data?.bizMsg ?? JSON.stringify(res)}\n`)
            } else if (res?.data?.bizMsg && res.data.bizMsg.indexOf("助力已满员") > -1) {
                console.log(`助力好友【${$.theName}】结果：好友助力已满\n`)
                if (checkArr($.myCodes, code) > -1) $.myCodes.splice(checkArr($.myCodes, code), 1) // 剔除助力已满的助力码
                if (checkArr($.otherCodes, code) > -1) $.otherCodes.splice(checkArr($.otherCodes, code), 1) // 剔除助力已满的助力码
                if ($.HelpOuts.helpFull.indexOf($.theName) == -1) $.HelpOuts.helpFull.push($.theName)
                // } else if ([108, -1001].includes(res?.data?.bizCode)) {

            } else if (res?.data?.bizMsg && res.data.bizMsg.indexOf("爱心值已爆棚") > -1) {
                console.log(`助力好友【${$.theName}】结果：助力次数耗尽，跳出\n`)
                if (!$.helpRunout.includes($.index)) $.helpRunout.push($.index)
                if ($.HelpOuts.helpOut.indexOf($.UserName) == -1) $.HelpOuts.helpOut.push($.UserName)
                break
            } else {
                console.log(`助力好友【${$.theName}】失败：${res?.data?.bizMsg ?? JSON.stringify(res)}\n`)
            }
            await $.wait(1000)
        }
    }
}

function showMsg() {
    return new Promise(async resolve => {
        message += `本次获得${$.earn}健康值，累计${$.score}健康值\n`
        $.msg($.name, '', `京东账号${$.index} ${$.UserName}\n${message}`);
        resolve();
    })
}

function getTaskDetail(taskId = '') {
    return new Promise(resolve => {
        $.get(taskUrl('jdhealth_getTaskDetail', { "buildingId": "", taskId: taskId === -1 ? '' : taskId, "channelId": 1 }),
            async (err, resp, data) => {
                try {
                    if (safeGet(data)) {
                        data = $.toObj(data)
                        if (data?.data?.bizMsg && data.data.bizMsg.indexOf("活动太火爆") > -1 && taskId === -1) {
                            $.isHuobao = true
                            if (!$.blackIndexs.includes($.index)) $.blackIndexs.push($.index)
                            console.log("账号火爆、跳过执行 . . .")
                            return
                        }
                        if (taskId === -1) {
                            let tmp = parseInt(parseFloat(data?.data?.result?.userScore ?? '0'))
                            if (!$.earn) {
                                $.score = tmp
                                $.earn = 1
                            } else {
                                $.earn = tmp - $.score
                                $.score = tmp
                            }
                            taskList = data.data.result.taskVos
                        } else if (taskId === 6) {
                            if (data?.data?.result?.taskVos) {
                                $.thisCode = data?.data?.result?.taskVos[0].assistTaskDetailVo.taskToken
                                if ($.thisCode) {
                                    console.log(`\n互助码:${$.thisCode}\n`);
                                    let thisarr = []
                                    thisarr.push($.index)
                                    thisarr.push($.thisCode)
                                    thisarr.push($.UserName)
                                    if (checkArr($.otherCodes, $.thisCode) == -1 && !$.myFronts.includes($.index)) $.otherCodes.push(thisarr)
                                    if (checkArr($.myCodes, $.thisCode) == -1 && $.myFronts.length > 0 && $.myFronts.includes($.index)) $.myCodes.push(thisarr)
                                }
                            }
                        } else if (taskId === 22) {
                            console.log(`${data?.data?.result?.taskVos[0]?.taskName}任务，完成次数：${data?.data?.result?.taskVos[0]?.times}/${data?.data?.result?.taskVos[0]?.maxTimes}`)
                            if (data?.data?.result?.taskVos[0]?.times === data?.data?.result?.taskVos[0]?.maxTimes) return
                            await doTask(data?.data?.result?.taskVos[0].shoppingActivityVos[0]?.taskToken, 22, 1)//领取任务
                            await $.wait(1000 * (data?.data?.result?.taskVos[0]?.waitDuration || 3));
                            await doTask(data?.data?.result?.taskVos[0].shoppingActivityVos[0]?.taskToken, 22, 0);//完成任务
                        } else {
                            for (let vo of data?.data?.result?.taskVos.filter(vo => vo.taskType !== 19) ?? []) {
                                console.log(`${vo.taskName}任务，完成次数：${vo.times}/${vo.maxTimes}`)
                                for (let i = vo.maxTimes - vo.times - 1; i >= 0; i--) {
                                    console.log(`去完成${vo.taskName}任务`)
                                    // console.log(vo)
                                    if (vo.taskType === 13) {
                                        await doTask(vo.simpleRecordInfoVo?.taskToken, vo?.taskId)
                                    } else if (vo.taskType === 8) {
                                        await doTask(vo.productInfoVos[i]?.taskToken, vo?.taskId, 1)
                                        await $.wait(1000 * 10)
                                        await doTask(vo.productInfoVos[i]?.taskToken, vo?.taskId, 0)
                                    } else if (vo.taskType === 9) {
                                        await doTask(vo.shoppingActivityVos[i]?.taskToken, vo?.taskId, 1)
                                        await $.wait(1000 * 10)
                                        await doTask(vo.shoppingActivityVos[i]?.taskToken, vo?.taskId, 0)
                                    } else if (vo.taskType === 10) {
                                        await doTask(vo.threeMealInfoVos[i]?.taskToken, vo?.taskId)
                                    } else if (vo.taskType === 26 || vo.taskType === 3) {
                                        await doTask(vo.shoppingActivityVos[i]?.taskToken, vo?.taskId)
                                    }
                                    else if (vo.taskType === 1) {
                                        for (let key of Object.keys(vo.followShopVo)) {
                                            let taskFollow = vo.followShopVo[key]
                                            if (taskFollow.status !== 2) {
                                                await doTask(taskFollow.taskToken, vo.taskId, 0)
                                                break
                                            }
                                        }
                                    }
                                    //新taskType 判断
                                    else if (vo.taskType === 15) {
                                        await doTask(vo.productInfoVos[i]?.taskToken, vo?.taskId, 0)
                                    } else if (vo.taskType === 21) {
                                        await doTask(vo.brandMemberVos[i]?.taskToken, vo?.taskId, 1)
                                        console.log("开卡任务只能领取到已开卡奖励")
                                    }
                                    await $.wait(2000)
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.log(e)
                } finally {
                    resolve()
                }
            })
    })
}

async function getCommodities() {
    return new Promise(async resolve => {
        const options = taskUrl('jdhealth_getCommodities')
        $.post(options, async (err, resp, data) => {
            try {
                if (safeGet(data)) {
                    data = $.toObj(data)
                    let beans = data.data.result.jBeans.filter(x => x.status !== 1)
                    if (beans.length !== 0) {
                        for (let key of Object.keys(beans)) {
                            let vo = beans[key]
                            if (vo.title === reward && $.score >= vo.exchangePoints) {
                                await $.wait(1000)
                                await exchange(vo.type, vo.id)
                            }
                        }
                    } else {
                        console.log(`兑换京豆次数已达上限`)
                    }
                }
            } catch (e) {
                console.log(e)
            } finally {
                resolve(data)
            }
        })
    })
}

function exchange(commodityType, commodityId) {
    return new Promise(resolve => {
        const options = taskUrl('jdhealth_exchange', { commodityType, commodityId })
        $.post(options, (err, resp, data) => {
            try {
                if (safeGet(data)) {
                    data = $.toObj(data)
                    if (data.data.bizCode === 0 || data.data.bizMsg === "success") {
                        $.score = data.data.result.userScore
                        console.log(`兑换${data.data.result.jingBeanNum}京豆成功`)
                        message += `兑换${data.data.result.jingBeanNum}京豆成功\n`
                        if ($.isNode()) {
                            allMessage += `【京东账号${$.index}】 ${$.UserName}\n兑换${data.data.result.jingBeanNum}京豆成功🎉${$.index !== cookiesArr.length ? '\n\n' : ''}`
                        }
                    }
                }
            } catch (e) {
                console.log(e)
            } finally {
                resolve(data)
            }
        })
    })
}

function doTask(taskToken, taskId, actionType = 0) {
    return new Promise(resolve => {
        const options = taskUrl('jdhealth_collectScore', { taskToken, taskId, actionType })
        $.get(options,
            (err, resp, data) => {
                try {
                    // console.log(data)
                    if (safeGet(data)) {
                        data = $.toObj(data)
                        if ([0, 1].includes(data?.data?.bizCode ?? -1)) {
                            $.canDo = true
                            if (actionType != 99) {
                                if (data?.data?.result?.score) console.log(`任务完成成功，获得：${data?.data?.result?.score ?? '未知'}能量`)
                                else console.log(`任务领取结果：${data?.data?.bizMsg ?? JSON.stringify(data)}`)
                            }
                        } else {
                            if (actionType != 99) console.log(`任务完成失败：${data?.data?.bizMsg ?? JSON.stringify(data)}`)
                        }
                    }
                } catch (e) {
                    console.log(e)
                } finally {
                    resolve(data)
                }
            })
    })
}

function doLottery() {
    console.log("执行抢京豆")
    return new Promise(resolve => {
        const options = taskUrl('jdhealth_doLottery', { taskId: 1 })
        $.get(options, (err, resp, data) => {
            try {
                // console.log(data)
                if (safeGet(data)) {
                    data = $.toObj(data)
                    // console.log(data)
                    // if ([0, 1].includes(data?.data?.bizCode ?? -1)) {
                    // 	$.canDo = true
                    // 	if (actionType != 99) {
                    // 		if (data?.data?.result?.score) console.log(`任务完成成功，获得：${data?.data?.result?.score ?? '未知'}能量`)
                    // 		else console.log(`任务领取结果：${data?.data?.bizMsg ?? JSON.stringify(data)}`)
                    // 	}
                    // } else {
                    // 	if (actionType != 99) console.log(`任务完成失败：${data?.data?.bizMsg ?? JSON.stringify(data)}`)
                    // }
                    console.log(`抢京豆结果: ${data?.data?.bizMsg || data}`)
                }
            } catch (e) {
                console.log(e)
            } finally {
                resolve(data)
            }
        })
    })
}

function collectScore() {
    return new Promise(resolve => {
        $.get(taskUrl('jdhealth_collectProduceScore', {}),
            (err, resp, data) => {
                try {
                    if (safeGet(data)) {
                        data = $.toObj(data)
                        if (data?.data?.bizCode === 0) {
                            if (data?.data?.result?.produceScore)
                                console.log(`任务完成成功，获得：${data?.data?.result?.produceScore ?? '未知'}能量`)
                            else
                                console.log(`任务领取结果：${data?.data?.bizMsg ?? JSON.stringify(data)}`)
                        } else {
                            console.log(`任务完成失败：${data?.data?.bizMsg ?? JSON.stringify(data)}`)
                        }
                    }
                } catch (e) {
                    console.log(e)
                } finally {
                    resolve()
                }
            })
    })
}

function taskUrl(function_id, body = {}) {
    return {
        url: `${JD_API_HOST}?functionId=${function_id}&body=${escape(JSON.stringify(body))}&client=wh5&clientVersion=1.0.0&uuid=`,
        headers: {
            "Cookie": cookie,
            "origin": "https://h5.m.jd.com",
            "referer": "https://h5.m.jd.com/",
            'accept-language': 'zh-cn',
            'accept-encoding': 'gzip, deflate, br',
            'accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/x-www-form-urlencoded',
            "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1")
        }
    }
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
        // console.log(`开始获取${$.name}配置文件\n`);
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
            url: "https://me-api.jd.com/user_new/info/GetJDUserInfoUnion",
            headers: {
                Host: "me-api.jd.com",
                Accept: "*/*",
                Connection: "keep-alive",
                Cookie: cookie,
                "User-Agent": $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
                "Accept-Language": "zh-cn",
                "Referer": "https://home.m.jd.com/myJd/newhome.action?sceneval=2&ufc=&",
                "Accept-Encoding": "gzip, deflate, br"
            }
        }
        $.get(options, (err, resp, data) => {
            try {
                if (err) {
                    $.logErr(err)
                } else {
                    if (data) {
                        data = JSON.parse(data);
                        if (data['retcode'] === "1001") {
                            $.isLogin = false; //cookie过期
                            return;
                        }
                        if (data['retcode'] === "0" && data.data && data.data.hasOwnProperty("userInfo")) {
                            $.nickName = data.data.userInfo.baseInfo.nickname;
                        }
                    } else {
                        $.log('京东服务器返回空数据');
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

// prettier-ignore
function Env(t, e) { "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0); class s { constructor(t) { this.env = t } send(t, e = "GET") { t = "string" == typeof t ? { url: t } : t; let s = this.get; return "POST" === e && (s = this.post), new Promise((e, i) => { s.call(this, t, (t, s, r) => { t ? i(t) : e(s) }) }) } get(t) { return this.send.call(this.env, t) } post(t) { return this.send.call(this.env, t, "POST") } } return new class { constructor(t, e) { this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`) } isNode() { return "undefined" != typeof module && !!module.exports } isQuanX() { return "undefined" != typeof $task } isSurge() { return "undefined" != typeof $httpClient && "undefined" == typeof $loon } isLoon() { return "undefined" != typeof $loon } toObj(t, e = null) { try { return JSON.parse(t) } catch { return e } } toStr(t, e = null) { try { return JSON.stringify(t) } catch { return e } } getjson(t, e) { let s = e; const i = this.getdata(t); if (i) try { s = JSON.parse(this.getdata(t)) } catch { } return s } setjson(t, e) { try { return this.setdata(JSON.stringify(t), e) } catch { return !1 } } getScript(t) { return new Promise(e => { this.get({ url: t }, (t, s, i) => e(i)) }) } runScript(t, e) { return new Promise(s => { let i = this.getdata("@chavy_boxjs_userCfgs.httpapi"); i = i ? i.replace(/\n/g, "").trim() : i; let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout"); r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r; const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } }; this.post(n, (t, e, i) => s(i)) }).catch(t => this.logErr(t)) } loaddata() { if (!this.isNode()) return {}; { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e); if (!s && !i) return {}; { const i = s ? t : e; try { return JSON.parse(this.fs.readFileSync(i)) } catch (t) { return {} } } } } writedata() { if (this.isNode()) { this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path"); const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data); s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r) } } lodash_get(t, e, s) { const i = e.replace(/\[(\d+)\]/g, ".$1").split("."); let r = t; for (const t of i) if (r = Object(r)[t], void 0 === r) return s; return r } lodash_set(t, e, s) { return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t) } getdata(t) { let e = this.getval(t); if (/^@/.test(t)) { const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : ""; if (r) try { const t = JSON.parse(r); e = t ? this.lodash_get(t, i, "") : e } catch (t) { e = "" } } return e } setdata(t, e) { let s = !1; if (/^@/.test(e)) { const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}"; try { const e = JSON.parse(h); this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i) } catch (e) { const o = {}; this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i) } } else s = this.setval(t, e); return s } getval(t) { return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null } setval(t, e) { return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null } initGotEnv(t) { this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar)) } get(t, e = (() => { })) { t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => { try { if (t.headers["set-cookie"]) { const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString(); s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar } } catch (t) { this.logErr(t) } }).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) })) } post(t, e = (() => { })) { if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => { !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i) }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => e(t)); else if (this.isNode()) { this.initGotEnv(t); const { url: s, ...i } = t; this.got.post(s, i).then(t => { const { statusCode: s, statusCode: i, headers: r, body: o } = t; e(null, { status: s, statusCode: i, headers: r, body: o }, o) }, t => { const { message: s, response: i } = t; e(s, i, i && i.body) }) } } time(t, e = null) { const s = e ? new Date(e) : new Date; let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() }; /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length))); for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length))); return t } msg(e = t, s = "", i = "", r) { const o = t => { if (!t) return t; if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0; if ("object" == typeof t) { if (this.isLoon()) { let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"]; return { openUrl: e, mediaUrl: s } } if (this.isQuanX()) { let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl; return { "open-url": e, "media-url": s } } if (this.isSurge()) { let e = t.url || t.openUrl || t["open-url"]; return { url: e } } } }; if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) { let t = ["", "==============📣系统通知📣=============="]; t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t) } } log(...t) { t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator)) } logErr(t, e) { const s = !this.isSurge() && !this.isQuanX() && !this.isLoon(); s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t) } wait(t) { return new Promise(e => setTimeout(e, t)) } done(t = {}) { const e = (new Date).getTime(), s = (e - this.startTime) / 1e3; this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t) } }(t, e) }
