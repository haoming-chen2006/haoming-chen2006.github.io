local zhasi = fk.CreateSkill {
  name = "zhasi",
  tags = { Skill.Limited },
}

Fk:loadTranslationTable{
  ["zhasi"] = "诈死",
  [":zhasi"] = "限定技，当你受到致命伤害时，你可以防止之，失去〖猘横〗并获得〖制衡〗，然后你不计入座次和距离计算，直到你对其他角色使用牌"..
  "或当你受到伤害后。",

  ["#zhasi-invoke"] = "诈死：你可以防止受到的致命伤害，不计入距离和座次！",
  ["@@zhasi"] = "诈死",

  ["$zhasi1"] = "内外大事悉付权弟，无需问我。",
  ["$zhasi2"] = "今遭小人暗算，不如将计就计。",
}

zhasi:addEffect(fk.DetermineDamageInflicted, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhasi.name) and
      data.damage >= (player.hp + player.shield) and
      player:usedSkillTimes(zhasi.name, Player.HistoryGame) == 0
  end,
  on_cost = function(self, event, target, player, data)
    return player.room:askToSkillInvoke(player, {
      skill_name = zhasi.name,
      prompt = "#zhasi-invoke",
    })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:handleAddLoseSkills(player, "-zhihengs|ex__zhiheng")
    room:setPlayerMark(player, "@@zhasi", 1)
    data:preventDamage()
  end,
})

local spec = {
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    room:setPlayerMark(player, "@@zhasi", 0)
  end,
}

zhasi:addEffect(fk.TargetSpecified, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:getMark("@@zhasi") > 0 and
      data.firstTarget and table.find(data.use.tos, function(p)
        return p ~= player
      end)
  end,
  on_refresh = spec.on_refresh,
})
zhasi:addEffect(fk.Damaged, {
  can_refresh = function(self, event, target, player, data)
    return target == player and player:getMark("@@zhasi") > 0
  end,
  on_refresh = spec.on_refresh,
})

zhasi:addEffect("targetmod", {
  remove_func = function (self, player)
    return player:getMark("@@zhasi") ~= 0
  end
})

return zhasi
