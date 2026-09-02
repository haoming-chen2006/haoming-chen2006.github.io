local shuangxiong = fk.CreateSkill {
  name = "shuangxiong",
}

Fk:loadTranslationTable{
  ["shuangxiong"] = "双雄",
  [":shuangxiong"] = "摸牌阶段，你可以选择放弃摸牌并进行一次判定：你获得此判定牌并且此回合可以将任意一张与该判定牌不同颜色的手牌当【决斗】使用。",

  ["@shuangxiong-turn"] = "双雄",
  ["#shuangxiong"] = "双雄：你可以将一张%arg手牌当【决斗】使用",

  ["$shuangxiong1"] = "吾乃河北上将颜良文丑是也！",
  ["$shuangxiong2"] = "快来与我等决一死战！",
}

shuangxiong:addEffect("viewas", {
  anim_type = "offensive",
  pattern = "duel",
  prompt = function(self, player)
    local mark = player:getTableMark("@shuangxiong-turn")
    local color = ""
    if #mark == 1 then
      if mark[1] == "red" then
        color = "black"
      else
        color = "red"
      end
    end
    return "#shuangxiong:::"..color
  end,
  handly_pile = true,
  filter_pattern = function (self, player, card_name, selected)
    local colors = player:getTableMark("@shuangxiong-turn")
    if #colors > 0 then
      local _colors = {}
      if table.contains(colors, "red") then
        table.insert(_colors, "black")
      end
      if table.contains(colors, "black") then
        table.insert(_colors, "red")
      end
      return {
        max_num = 1,
        min_num = 1,
        pattern = ".|.|" .. table.concat(_colors, ",") .."|^equip",
      }
    end
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    local c = Fk:cloneCard("duel")
    c:addSubcard(cards[1])
    c.skillName = shuangxiong.name
    return c
  end,
  enabled_at_play = function(self, player)
    return #player:getTableMark("@shuangxiong-turn") > 0
  end,
  enabled_at_response = function(self, player, response)
    return #player:getTableMark("@shuangxiong-turn") > 0 and not response
  end,
})
shuangxiong:addEffect(fk.EventPhaseStart, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(shuangxiong.name) and player.phase == Player.Draw and not data.phase_end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    data.phase_end = true
    local judge = {
      who = player,
      reason = "shuangxiong",
    }
    player:revealBySkillName("shuangxiong") -- 先这样
    room:judge(judge)
    local color = judge.card:getColorString()
    if color == "nocolor" then return end
    room:addTableMarkIfNeed(player, "@shuangxiong-turn", color)
  end,
})
shuangxiong:addEffect(fk.FinishJudge, {
  mute = true,
  is_delay_effect = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and not player.dead and data.reason == shuangxiong.name and
      player.room:getCardArea(data.card) == Card.Processing
  end,
  on_use = function(self, event, target, player, data)
    player.room:obtainCard(player, data.card, true, fk.ReasonJustMove, player, shuangxiong.name)
  end,
})

shuangxiong:addAI(nil, "vs_skill")

return shuangxiong
