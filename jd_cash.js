/*
签到领现金，每日2毛～5毛
可互助，助力码每日不变，只变日期
活动入口：京东APP搜索领现金进入
2 0-23/4 * * * jd_cash.js
annyooo 修改
已无助力, 暂不做助力逻辑处理
*/

const $ = new Env('签到领现金');
const notify = $.isNode() ? require('./sendNotify') : '';
//Node.js用户请在jdCookie.js处填写京东ck;
const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
let jdNotify = true;//是否关闭通知，false打开通知推送，true关闭通知推送
//IOS等用户直接用NobyDa的jd cookie
let cookiesArr = [], cookie = '', message;
let cash_exchange = false;//是否消耗2元红包兑换200京豆，默认否

const thefs = require('fs');
let outpath = './Cash_HelpOut.json'
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

if ($.isNode()) {
    Object.keys(jdCookieNode).forEach((item) => {
        cookiesArr.push(jdCookieNode[item])
    })
    if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => { };
} else {
    cookiesArr = [$.getdata('CookieJD'), $.getdata('CookieJD2'), ...jsonParse($.getdata('CookiesJD') || "[]").map(item => item.cookie)].filter(item => !!item);
}

const JD_API_HOST = 'https://api.m.jd.com/client.action';
let allMessage = '';

!(async () => {
    if (!cookiesArr[0]) {
        $.msg($.name, '【提示】请先获取京东账号一cookie\n直接使用NobyDa的京东签到获取', 'https://bean.m.jd.com/bean/signIndex.action', { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
        return;
    }
    await requireConfig()
    $.authorCode = []
    for (let i = 0; i < cookiesArr.length; i++) {
        if (cookiesArr[i]) {
            cookie = cookiesArr[i];
            $.UserName = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1])
            $.index = i + 1;
            $.isLogin = true;
            $.nickName = '';
            message = '';
            await TotalBean();
            console.log(`\n\n******开始【京东账号${$.index}】${$.nickName || $.UserName}*********\n`);
            if (!$.isLogin) {
                $.msg($.name, `【提示】cookie已失效`, `京东账号${$.index} ${$.nickName || $.UserName}\n请重新登录获取\nhttps://bean.m.jd.com/bean/signIndex.action`, { "open-url": "https://bean.m.jd.com/bean/signIndex.action" });
                if ($.isNode()) {
                    await notify.sendNotify(`${$.name}cookie已失效 - ${$.UserName}`, `京东账号${$.index} ${$.UserName}\n请重新登录获取cookie`);
                }
                continue
            }
            await jdCash()
        }
    }
    if (allMessage) {
        if ($.isNode() && (process.env.CASH_NOTIFY_CONTROL ? process.env.CASH_NOTIFY_CONTROL === 'false' : !!1)) await notify.sendNotify($.name, allMessage);
        $.msg($.name, '', allMessage);
    }
})()
    .catch((e) => {
        $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
        $.done();
    })

async function jdCash() {
    $.signMoney = 0;
    await appindex()
    await index()
    await shareCodesFormat()
    //await helpFriends() //取消助力
    //await getReward()
    //await getReward('2');
    $.exchangeBeanNum = 0;
    cash_exchange = $.isNode() ? (process.env.CASH_EXCHANGE ? process.env.CASH_EXCHANGE : `${cash_exchange}`) : ($.getdata('cash_exchange') ? $.getdata('cash_exchange') : `${cash_exchange}`);
    await appindex(true)
}

async function appindex(info = false) {
    let functionId = "cash_homePage"
    let body = {}
    let sign = await getSign(functionId, body)
    if (!sign) return
    return new Promise((resolve) => {
        $.post(apptaskUrl(functionId, sign), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data.code === 0 && data.data.result) {
                            if (info) {
                                if (message) {
                                    message += `当前现金：${data.data.result.totalMoney}元`;
                                    allMessage += `京东账号${$.index}${$.nickName}\n${message}${$.index !== cookiesArr.length ? '\n\n' : ''}`;
                                }
                                console.log(`\n【京东账号${$.index}】当前现金：${data.data.result.totalMoney}元`);
                                return
                            }
                            $.signMoney = data.data.result.totalMoney;
                            $.thisCode = data.data.result.invitedCode || ""
                            if ($.thisCode) {
                                console.log(`互助码:${$.thisCode}\n`);
                                let thisarr = []
                                thisarr.push($.index)
                                thisarr.push($.thisCode)
                                thisarr.push($.UserName)
                                if (checkArr($.otherCodes, $.thisCode) == -1 && !$.myFronts.includes($.index)) $.otherCodes.push(thisarr)
                                if (checkArr($.myCodes, $.thisCode) == -1 && $.myFronts.length > 0 && $.myFronts.includes($.index)) $.myCodes.push(thisarr)
                            }

                            let helpInfo = {
                                'inviteCode': data.data.result.invitedCode,
                                'shareDate': data.data.result.shareDate
                            }
                            $.shareDate = data.data.result.shareDate;
                            for (let task of data.data.result.taskInfos) {
                                if (task.type === 4) {
                                    for (let i = task.doTimes; i < task.times; ++i) {
                                        console.log(`去做${task.name}任务 ${i + 1}/${task.times}`)
                                        await appdoTask(task.type, task.jump.params.skuId)
                                        await $.wait(5000)
                                    }
                                } else if (task.type === 2) {
                                    for (let i = task.doTimes; i < task.times; ++i) {
                                        console.log(`去做${task.name}任务 ${i + 1}/${task.times}`)
                                        await appdoTask(task.type, task.jump.params.shopId)
                                        await $.wait(5000)
                                    }
                                } else if (task.type === 30) {
                                    for (let i = task.doTimes; i < task.times; ++i) {
                                        console.log(`去做${task.name}任务 ${i + 1}/${task.times}`)
                                        await appdoTask(task.type, task.jump.params.path)
                                        await $.wait(5000)
                                    }
                                } else if (task.type === 16 || task.type === 3 || task.type === 5 || task.type === 17 || task.type === 21) {
                                    for (let i = task.doTimes; i < task.times; ++i) {
                                        console.log(`去做${task.name}任务 ${i + 1}/${task.times}`)
                                        await appdoTask(task.type, task.jump.params.url)
                                        await $.wait(5000)
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

function index() {
    return new Promise((resolve) => {
        $.get(taskUrl("cash_mob_home"), async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data.code === 0 && data.data.result) {
                            for (let task of data.data.result.taskInfos) {
                                if (task.type === 4) {
                                    for (let i = task.doTimes; i < task.times; ++i) {
                                        console.log(`去做${task.name}任务 ${i + 1}/${task.times}`)
                                        await doTask(task.type, task.jump.params.skuId)
                                        await $.wait(5000)
                                    }
                                } else if (task.type === 2) {
                                    for (let i = task.doTimes; i < task.times; ++i) {
                                        console.log(`去做${task.name}任务 ${i + 1}/${task.times}`)
                                        await doTask(task.type, task.jump.params.shopId)
                                        await $.wait(5000)
                                    }
                                } else if (task.type === 31) {
                                    for (let i = task.doTimes; i < task.times; ++i) {
                                        console.log(`去做${task.name}任务 ${i + 1}/${task.times}`)
                                        await doTask(task.type, task.jump.params.path)
                                        await $.wait(5000)
                                    }
                                } else if (task.type === 16 || task.type === 3 || task.type === 5 || task.type === 17 || task.type === 21) {
                                    for (let i = task.doTimes; i < task.times; ++i) {
                                        console.log(`去做${task.name}任务 ${i + 1}/${task.times}`)
                                        await doTask(task.type, task.jump.params.url)
                                        await $.wait(5000)
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

async function appdoTask(type, taskInfo) {
    let functionId = 'cash_doTask'
    let body = { "type": type, "taskInfo": taskInfo }
    let sign = await getSign(functionId, body)
    if (!sign) return
    return new Promise((resolve) => {
        $.post(apptaskUrl(functionId, sign), (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data.code === 0) {
                            console.log(`任务完成成功`)
                        } else {
                            console.log(JSON.stringify(data))
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

function doTask(type, taskInfo) {
    return new Promise((resolve) => {
        $.get(taskUrl("cash_doTask", { "type": type, "taskInfo": taskInfo }), (err, resp, data) => {
            try {
                if (err) {
                    console.log(`${JSON.stringify(err)}`)
                    console.log(`${$.name} API请求失败，请检查网路重试`)
                } else {
                    if (safeGet(data)) {
                        data = JSON.parse(data);
                        if (data.code === 0) {
                            console.log(`任务完成成功`)
                        } else {
                            console.log(data)
                        }
                    }
                }
            } catch (e) {
                $.logErr(e, resp)
            } finally {
                resolve(data);
            }
        })
    })
}

function getSign(functionId, body) {
    var strsign = '';
    let data = {
        "fn": functionId,
        "body": body
    }
    return new Promise((resolve) => {
        let url = {
            url: "https://api.jds.codes/jd/sign",
            body: JSON.stringify(data),
            followRedirect: false,
            headers: {
                'Accept': '*/*',
                "accept-encoding": "gzip, deflate, br",
                'Content-Type': 'application/json',
            },
            timeout: 30000
        }
        $.post(url, async (err, resp, data) => {
            try {
                if (err) {
                    console.log(`getSign: API请求失败，请检查网路重试\n`)
                } else {
                    data = JSON.parse(data);
                    strsign = data.data.sign;
                }
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve(strsign);
            }
        })
    })
}

function randomString(e) {
    e = e || 32;
    let t = "abcdefghijklmnopqrstuvwxyz0123456789", a = t.length, n = "";
    for (let i = 0; i < e; i++)
        n += t.charAt(Math.floor(Math.random() * a));
    return n
}

function showMsg() {
    return new Promise(resolve => {
        if (!jdNotify) {
            $.msg($.name, '', `${message}`);
        } else {
            $.log(`京东账号${$.index}${$.nickName}\n${message}`);
        }
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

function requireConfig() {
    return new Promise(async resolve => {
        console.log(`共${cookiesArr.length}个京东账号\n\n============================================================`)
        console.log(`你的互助配置如下：\n互助模式：${helpRandom + "" === "true" ? '随机互助' : '顺序互助'}\n优先被助力账号：${$.myFronts.length > 0 ? $.myFronts.toString() : '未设定'}`);
        console.log(`\n环境变量设置提示：\nexport jd_helpFronts="1,2,3-5" 表示账号12345固定优先被助力\nexport jd_helpRandom="true" 表示固定助力过后全部随机助力、反之顺序助力`);
        console.log(`\n脚本先执行日常任务，最后再执行内部互助\n助力码直接脚本获取，解决助力码过长问题\n助力已满和耗尽的号，会缓存至本地以过滤`);
        console.log(`\n领现金已无助力、暂停互助任务 . . .`);
        console.log(`============================================================\n`)
        resolve()
    })
}

function apptaskUrl(functionId = "", body = "") {
    return {
        url: `${JD_API_HOST}?functionId=${functionId}`,
        body,
        headers: {
            'Cookie': cookie,
            'Host': 'api.m.jd.com',
            'Connection': 'keep-alive',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': '',
            'User-Agent': 'JD4iPhone/167774 (iPhone; iOS 14.7.1; Scale/3.00)',
            'Accept-Language': 'zh-Hans-CN;q=1',
            'Accept-Encoding': 'gzip, deflate, br',
        }
    }
}

function taskUrl(functionId, body = {}) {
    return {
        url: `${JD_API_HOST}?functionId=${functionId}&body=${encodeURIComponent(JSON.stringify(body))}&appid=CashRewardMiniH5Env&appid=9.1.0`,
        headers: {
            'Cookie': cookie,
            'Host': 'api.m.jd.com',
            'Connection': 'keep-alive',
            'Content-Type': 'application/json',
            'Referer': 'http://wq.jd.com/wxapp/pages/hd-interaction/index/index',
            'User-Agent': $.isNode() ? (process.env.JD_USER_AGENT ? process.env.JD_USER_AGENT : (require('./USER_AGENTS').USER_AGENT)) : ($.getdata('JDUA') ? $.getdata('JDUA') : "jdapp;iPhone;9.4.4;14.3;network/4g;Mozilla/5.0 (iPhone; CPU iPhone OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148;supportJDSHWK/1"),
            'Accept-Language': 'zh-cn',
            'Accept-Encoding': 'gzip, deflate, br',
        }
    }
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
function Env(t, e) {
    "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0);

    class s {
        constructor(t) {
            this.env = t
        }

        send(t, e = "GET") {
            t = "string" == typeof t ? { url: t } : t;
            let s = this.get;
            return "POST" === e && (s = this.post), new Promise((e, i) => {
                s.call(this, t, (t, s, r) => {
                    t ? i(t) : e(s)
                })
            })
        }

        get(t) {
            return this.send.call(this.env, t)
        }

        post(t) {
            return this.send.call(this.env, t, "POST")
        }
    }

    return new class {
        constructor(t, e) {
            this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `🔔${this.name}, 开始!`)
        }

        isNode() {
            return "undefined" != typeof module && !!module.exports
        }

        isQuanX() {
            return "undefined" != typeof $task
        }

        isSurge() {
            return "undefined" != typeof $httpClient && "undefined" == typeof $loon
        }

        isLoon() {
            return "undefined" != typeof $loon
        }

        toObj(t, e = null) {
            try {
                return JSON.parse(t)
            } catch {
                return e
            }
        }

        toStr(t, e = null) {
            try {
                return JSON.stringify(t)
            } catch {
                return e
            }
        }

        getjson(t, e) {
            let s = e;
            const i = this.getdata(t);
            if (i) try {
                s = JSON.parse(this.getdata(t))
            } catch {
            }
            return s
        }

        setjson(t, e) {
            try {
                return this.setdata(JSON.stringify(t), e)
            } catch {
                return !1
            }
        }

        getScript(t) {
            return new Promise(e => {
                this.get({ url: t }, (t, s, i) => e(i))
            })
        }

        runScript(t, e) {
            return new Promise(s => {
                let i = this.getdata("@chavy_boxjs_userCfgs.httpapi");
                i = i ? i.replace(/\n/g, "").trim() : i;
                let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");
                r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r;
                const [o, h] = i.split("@"), n = { url: `http://${h}/v1/scripting/evaluate`, body: { script_text: t, mock_type: "cron", timeout: r }, headers: { "X-Key": o, Accept: "*/*" } };
                this.post(n, (t, e, i) => s(i))
            }).catch(t => this.logErr(t))
        }

        loaddata() {
            if (!this.isNode()) return {};
            {
                this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path");
                const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e);
                if (!s && !i) return {};
                {
                    const i = s ? t : e;
                    try {
                        return JSON.parse(this.fs.readFileSync(i))
                    } catch (t) {
                        return {}
                    }
                }
            }
        }

        writedata() {
            if (this.isNode()) {
                this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path");
                const t = this.path.resolve(this.dataFile), e = this.path.resolve(process.cwd(), this.dataFile), s = this.fs.existsSync(t), i = !s && this.fs.existsSync(e), r = JSON.stringify(this.data);
                s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r)
            }
        }

        lodash_get(t, e, s) {
            const i = e.replace(/\[(\d+)\]/g, ".$1").split(".");
            let r = t;
            for (const t of i) if (r = Object(r)[t], void 0 === r) return s;
            return r
        }

        lodash_set(t, e, s) {
            return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t)
        }

        getdata(t) {
            let e = this.getval(t);
            if (/^@/.test(t)) {
                const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : "";
                if (r) try {
                    const t = JSON.parse(r);
                    e = t ? this.lodash_get(t, i, "") : e
                } catch (t) {
                    e = ""
                }
            }
            return e
        }

        setdata(t, e) {
            let s = !1;
            if (/^@/.test(e)) {
                const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}";
                try {
                    const e = JSON.parse(h);
                    this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i)
                } catch (e) {
                    const o = {};
                    this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i)
                }
            } else s = this.setval(t, e);
            return s
        }

        getval(t) {
            return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null
        }

        setval(t, e) {
            return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null
        }

        initGotEnv(t) {
            this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar))
        }

        get(t, e = (() => {
        })) {
            t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.get(t, (t, s, i) => {
                !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i)
            })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => {
                const { statusCode: s, statusCode: i, headers: r, body: o } = t;
                e(null, { status: s, statusCode: i, headers: r, body: o }, o)
            }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => {
                try {
                    if (t.headers["set-cookie"]) {
                        const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();
                        s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar
                    }
                } catch (t) {
                    this.logErr(t)
                }
            }).then(t => {
                const { statusCode: s, statusCode: i, headers: r, body: o } = t;
                e(null, { status: s, statusCode: i, headers: r, body: o }, o)
            }, t => {
                const { message: s, response: i } = t;
                e(s, i, i && i.body)
            }))
        }

        post(t, e = (() => {
        })) {
            if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, { "X-Surge-Skip-Scripting": !1 })), $httpClient.post(t, (t, s, i) => {
                !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i)
            }); else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, { hints: !1 })), $task.fetch(t).then(t => {
                const { statusCode: s, statusCode: i, headers: r, body: o } = t;
                e(null, { status: s, statusCode: i, headers: r, body: o }, o)
            }, t => e(t)); else if (this.isNode()) {
                this.initGotEnv(t);
                const { url: s, ...i } = t;
                this.got.post(s, i).then(t => {
                    const { statusCode: s, statusCode: i, headers: r, body: o } = t;
                    e(null, { status: s, statusCode: i, headers: r, body: o }, o)
                }, t => {
                    const { message: s, response: i } = t;
                    e(s, i, i && i.body)
                })
            }
        }

        time(t, e = null) {
            const s = e ? new Date(e) : new Date;
            let i = { "M+": s.getMonth() + 1, "d+": s.getDate(), "H+": s.getHours(), "m+": s.getMinutes(), "s+": s.getSeconds(), "q+": Math.floor((s.getMonth() + 3) / 3), S: s.getMilliseconds() };
            /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length)));
            for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length)));
            return t
        }

        msg(e = t, s = "", i = "", r) {
            const o = t => {
                if (!t) return t;
                if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? { "open-url": t } : this.isSurge() ? { url: t } : void 0;
                if ("object" == typeof t) {
                    if (this.isLoon()) {
                        let e = t.openUrl || t.url || t["open-url"], s = t.mediaUrl || t["media-url"];
                        return { openUrl: e, mediaUrl: s }
                    }
                    if (this.isQuanX()) {
                        let e = t["open-url"] || t.url || t.openUrl, s = t["media-url"] || t.mediaUrl;
                        return { "open-url": e, "media-url": s }
                    }
                    if (this.isSurge()) {
                        let e = t.url || t.openUrl || t["open-url"];
                        return { url: e }
                    }
                }
            };
            if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) {
                let t = ["", "==============📣系统通知📣=============="];
                t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t)
            }
        }

        log(...t) {
            t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator))
        }

        logErr(t, e) {
            const s = !this.isSurge() && !this.isQuanX() && !this.isLoon();
            s ? this.log("", `❗️${this.name}, 错误!`, t.stack) : this.log("", `❗️${this.name}, 错误!`, t)
        }

        wait(t) {
            return new Promise(e => setTimeout(e, t))
        }

        done(t = {}) {
            const e = (new Date).getTime(), s = (e - this.startTime) / 1e3;
            this.log("", `🔔${this.name}, 结束! 🕛 ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t)
        }
    }(t, e)
}
