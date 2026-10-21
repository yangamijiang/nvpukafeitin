import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';

test('member registration, persistence, login errors and logout',async({page})=>{
 const email=`member-${Date.now()}@example.test`,password=randomBytes(18).toString('hex');
 await page.goto('/');await page.getByRole('button',{name:'登录 / 注册'}).click();
 await expect(page.locator('#auth-dialog')).toBeVisible();
 await page.getByRole('tab',{name:'注册新账号'}).click();
 await page.getByLabel('你的昵称').fill('草莓会员');await page.getByLabel('邮箱地址').fill(email);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByLabel('确认密码').fill(password+'x');
 await page.getByRole('button',{name:'创建我的账号'}).click();await expect(page.locator('.auth-error')).toHaveText('两次输入的密码不一致');
 await page.getByLabel('确认密码').fill(password);await page.getByRole('button',{name:'创建我的账号'}).click();await expect(page.locator('#auth-dialog')).not.toBeVisible();await expect(page.locator('.account-name')).toHaveText('草莓会员');
 await page.reload();await expect(page.locator('.account-name')).toHaveText('草莓会员');await page.locator('.account-menu summary').click();await expect(page.locator('.account-dropdown')).toContainText('欢迎回家，会员');await expect(page.locator('.manage-content')).toHaveCount(0);
 await page.getByRole('button',{name:'退出登录'}).click();await expect(page.getByRole('button',{name:'登录 / 注册'})).toBeVisible();
 await page.getByRole('button',{name:'登录 / 注册'}).click();await page.getByLabel('邮箱地址').fill(email);await page.getByLabel('密码',{exact:true}).fill('wrong-password');await page.getByRole('button',{name:'登录，开启甜蜜时光'}).click();await expect(page.locator('.auth-error')).toContainText('邮箱或密码不正确');
 await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'显示密码'}).click();await expect(page.getByLabel('密码',{exact:true})).toHaveAttribute('type','text');await page.getByRole('button',{name:'登录，开启甜蜜时光'}).click();await expect(page.locator('.account-name')).toHaveText('草莓会员');
});

test('admin setup, private preview, publication, and cross-session content rendering',async({page,browser})=>{
 const original=(await (await page.request.get('/api/content')).json()).content;
 const password=randomBytes(18).toString('hex');
 await page.goto('/');await page.getByRole('button',{name:'登录 / 注册'}).click();await page.getByRole('button',{name:'首次设置管理员'}).click();
 await page.getByLabel('你的昵称').fill('木漏れ日店长');await page.getByLabel('邮箱地址').fill('owner@example.test');await page.getByLabel('密码',{exact:true}).fill(password);await page.getByLabel('确认密码').fill(password);await page.getByLabel('管理员初始化密钥').fill('wrong-key');await page.getByRole('button',{name:'创建管理员账号'}).click();await expect(page.locator('.auth-error')).toContainText('密钥不正确');
 await page.getByLabel('管理员初始化密钥').fill(process.env.TEST_SETUP_KEY);await page.getByRole('button',{name:'创建管理员账号'}).click();await expect(page.locator('#admin-panel')).toBeVisible();
 await page.getByLabel('首页主标题',{exact:true}).fill('欢迎回到我们的咖啡厅');await page.getByRole('button',{name:'预览修改',exact:true}).click();await expect(page.locator('.preview-banner')).toBeVisible();await expect(page.locator('.hero h1')).toContainText('欢迎回到我们的咖啡厅');
 const guest=await browser.newContext();const guestPage=await guest.newPage();await guestPage.goto('http://127.0.0.1:5174/');await expect(guestPage.locator('.hero h1')).toContainText(original.home.title);
 await page.getByRole('button',{name:'返回编辑',exact:true}).click();await page.getByRole('button',{name:'甜蜜菜单',exact:false}).filter({has:page.locator('span')}).first().click();
 await page.getByLabel('初恋草莓芭菲 · 价格（元）',{exact:true}).fill('42.5');await page.getByRole('button',{name:'保存并发布'}).click();await expect(page.locator('.editor-status')).toContainText('发布成功');
 await guestPage.reload();await expect(guestPage.locator('.hero h1')).toContainText('欢迎回到我们的咖啡厅');await expect(guestPage.locator('.menu-card').first()).toContainText('42.5');
 // Stored markup remains literal text; it must not become executable HTML.
 await page.locator('[data-editor-group="home"]').click();await page.getByLabel('首页主标题',{exact:true}).fill('<img src=x onerror=alert(1)>');await page.getByRole('button',{name:'保存并发布'}).click();await expect(page.locator('.editor-status')).toContainText('发布成功');await guestPage.reload();await expect(guestPage.locator('.hero h1')).toContainText('<img src=x onerror=alert(1)>');await expect(guestPage.locator('.hero h1 img')).toHaveCount(0);
 // Restore defaults to keep the independent original-site suite representative.
 const session=await (await page.request.get('/api/auth/me')).json();const current=await (await page.request.get('/api/content')).json();const restored=await page.request.put('/api/content',{headers:{'X-CSRF-Token':session.csrf},data:{content:original,revision:current.revision}});expect(restored.ok()).toBeTruthy();
 await page.getByRole('button',{name:'重新载入',exact:true}).click();await expect(page.getByLabel('首页主标题',{exact:true})).toHaveValue(original.home.title);
 await page.screenshot({path:'/tmp/komorebi-admin.png',fullPage:true});await guest.close();
});

test('mobile login layout is usable and registration can be dismissed',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'登录 / 注册'}).click();await expect(page.locator('#auth-dialog')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.getByRole('tab',{name:'注册新账号'}).click();await expect(page.getByLabel('确认密码')).toBeVisible();await page.getByRole('button',{name:'先逛一逛，稍后再登录'}).click();await expect(page.locator('#auth-dialog')).not.toBeVisible();await page.getByRole('button',{name:'登录 / 注册'}).click();await page.screenshot({path:'/tmp/komorebi-login-mobile.png',fullPage:true});
});

test('static-only hosting explains unavailable account service instead of faking login',async({page})=>{
 await page.route('**/api/**',route=>route.fulfill({status:404,contentType:'text/html',body:'Not found'}));await page.goto('/');await page.getByRole('button',{name:'登录 / 注册'}).click();await page.getByLabel('邮箱地址').fill('member@example.test');await page.getByLabel('密码',{exact:true}).fill('valid-test-password');await page.getByRole('button',{name:'登录，开启甜蜜时光'}).click();await expect(page.locator('.auth-error')).toContainText('账号服务尚未上线');await expect(page.locator('.account-name')).toHaveCount(0);await page.screenshot({path:'/tmp/komorebi-login-desktop.png',fullPage:true});
});
