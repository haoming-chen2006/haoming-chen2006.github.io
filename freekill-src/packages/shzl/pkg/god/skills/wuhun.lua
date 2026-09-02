local wuhun = fk.CreateSkill {
  name = "wuhun",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable {
  ["wuhun"] = "武魂",
  [":wuhun"] = "锁定技，当你受到1点伤害后，伤害来源获得1枚“梦魇”；你死亡时，令“梦魇”最多的一名其他角色判定，若不为【桃】或【桃园结义】，其死亡。",

  ["@nightmare"] = "梦魇",
  ["#wuhun-choose"] = "武魂：选择一名“梦魇”最多的其他角色",

  ["$wuhun1"] = "拿命来！",
  ["$wuhun2"] = "谁来与我同去？",
}

wuhun:addLoseEffect(function (self, player)
  local room = player.room
  for _, p in ipairs(room.alive_players) do
    room:setPlayerMark(p, "@nightmare", 0)
  end
end)

wuhun:addEffect(fk.Damaged, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(wuhun.name) and
      data.from and not data.from.dead
  end,
  on_use = function(self, event, target, player, data)
    player.room:addPlayerMark(data.from, "@nightmare", data.damage)
  end,
})

wuhun:addEffect(fk.Death, {
  anim_type = "offensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(wuhun.name, false, true) and
      table.find(player.room:getOtherPlayers(player, false), function(p)
        return p:getMark("@nightmare") > 0
      end)
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room:getOtherPlayers(player, false), function(p)
      return table.every(room:getOtherPlayers(player, false), function(p2)
        return p:getMark("@nightmare") >= p2:getMark("@nightmare")
      end)
    end)
    if #targets > 1 then
      targets = room:askToChoosePlayers(player, {
        min_num = 1,
        max_num = 1,
        targets = targets,
        skill_name = wuhun.name,
        prompt = "#wuhun-choose",
        cancelable = false,
      })
    end
    local to = targets[1]
    local judge = {
      who = to,
      reason = wuhun.name,
      pattern = "^(peach,god_salvation)",
    }
    room:judge(judge)
    if not judge:matchPattern() or to.dead then return end
    room:killPlayer{
      who = to,
      killer = player,
    }
  end,
})
--[[
wuhun:addAI(Fk.Ltk.AI.newChoosePlayersStrategy{
  choose_players = function(self, ai)
    return ai:askToChoosePlayers({
      targets = ai:getEnabledTargets(),
      min_num = 1,
      max_num = 1,
      skill_name = wuhun.name,
      benefit_func = function (logic, p)
        logic:killPlayer()
      end,
    })
  end,
})]]

return wuhun
