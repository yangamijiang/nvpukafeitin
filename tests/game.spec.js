import { test, expect } from '@playwright/test';

async function clickCanvasPoint(page,x,y){
  const canvas=page.locator('#cafe-canvas');
  const box=await canvas.boundingBox();
  await canvas.click({position:{x:box.width*x/480,y:box.height*y/270}});
}

test('player enters the pixel cafe and plays tic-tac-toe with Sakura',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button',{name:'进入像素咖啡厅'}).click();
  await expect(page.locator('#pixel-game')).toBeVisible();
  await expect(page.locator('#cafe-canvas')).toBeFocused();
  await clickCanvasPoint(page,132,113);
  await expect(page.locator('#game-dialogue')).toBeVisible();
  await expect(page.locator('#dialogue-name')).toHaveText('小樱');
  await expect(page.locator('#dialogue-text')).toContainText('心动三目棋');
  await page.getByRole('button',{name:'好呀，开始游戏'}).click();
  await expect(page.locator('#board-game')).toBeVisible();
  await expect(page.locator('#board-title')).toHaveText('心动三目棋');
  await expect(page.locator('#tic-board button')).toHaveCount(9);
  await page.locator('[data-cell="0"]').click();
  await expect(page.locator('#tic-board button.player')).toHaveCount(1);
  await expect(page.locator('#tic-board button.maid')).toHaveCount(1,{timeout:2000});
  await page.getByRole('button',{name:'离开牌桌'}).click();
  await expect(page.locator('#board-game')).not.toBeVisible();
  await page.getByRole('button',{name:'离开像素咖啡厅'}).click();
  await expect(page.locator('#pixel-game')).not.toBeVisible();
  expect(errors).toEqual([]);
});

test('player can chat with Aoi and start the memory tabletop game',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'进入像素咖啡厅'}).click();
  await clickCanvasPoint(page,350,113);
  await expect(page.locator('#dialogue-name')).toHaveText('小葵');
  await page.getByRole('button',{name:'先聊聊天'}).click();
  await expect(page.locator('#dialogue-text')).toContainText('记住翻过的甜点');
  await page.getByRole('button',{name:'好呀，开始游戏'}).click();
  await expect(page.locator('#board-title')).toHaveText('甜点翻翻乐');
  await expect(page.locator('#memory-board button')).toHaveCount(12);
  await page.locator('[data-card="0"]').click();
  await expect(page.locator('[data-card="0"]')).toHaveClass(/open/);
  await page.locator('[data-card="1"]').click();
  await expect(page.locator('#board-message')).not.toHaveText('你的回合！翻开两张甜点卡片。');
});

test('mobile game provides visible touch controls and closes cleanly',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await page.getByRole('button',{name:'进入像素咖啡厅'}).click();
  await expect(page.locator('.touch-controls')).toBeVisible();
  await expect(page.getByRole('button',{name:'向上'})).toBeVisible();
  await page.getByRole('button',{name:'互动'}).click();
  await expect(page.locator('#game-toast')).toContainText('靠近女仆');
  await page.getByRole('button',{name:'离开像素咖啡厅'}).click();
  await expect(page.locator('#pixel-game')).not.toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
