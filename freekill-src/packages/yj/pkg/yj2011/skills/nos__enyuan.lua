local enyuan = fk.CreateSkill {
  name = "nos__enyuan",
  tags = { Skill.Compulsory },
}

Fk:loadTranslationTable{
  ["nos__enyuan"] = "恩怨",
  [":nos__enyuan"] = "锁定技，其他角色每令你回复1点体力，该角色摸一张牌；其他角色每对你造成一次伤害，须给你一张<font color='red'>♥</font>手牌，"..
  "否则该角色失去1点体力。",

  ["#nos__enyuan-give"] = "恩怨：你需交给 %src 一张<font color='red'>♥</font>手牌，否则失去1点体力",

  ["$nos__enyuan1"] = "得人恩果千年记。",
  ["$nos__enyuan2"] = "滴水之恩，涌泉相报。",
  ["$nos__enyuan3"] = "谁敢得罪我？",
  ["$nos__enyuan4"] = "睚眦之怨，无不报复。",
}

enyuan:addEffect(fk.HpRecover, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(enyuan.name) and
      data.recoverBy and data.recoverBy ~= player and not data.recoverBy.dead
  end,
  on_cost = function (self, event, target, player, data)
    event:setCostData(self, {tos = {data.recoverBy}})
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(enyuan.name, math.random(1, 2))
    room:notifySkillInvoked(player, enyuan.name, "support")
    data.recoverBy:drawCards(data.num, enyuan.name)
  end,
})

enyuan:addEffect(fk.Damaged, {
  mute = true,
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(enyuan.name) and
      data.from and data.from ~= player and not data.from.dead
  end,
  on_cost = function (self, event, target, player, data)
    event:setCostData(self, {tos = {data.from}})
    return true
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    player:broadcastSkillInvoke(enyuan.name, math.random(3, 4))
    room:notifySkillInvoked(player, enyuan.name)
    if data.from:isKongcheng() then
      room:loseHp(data.from, 1, enyuan.name)
    else
      local card = room:askToCards(data.from, {
        skill_name = enyuan.name,
        min_num = 1,
        max_num = 1,
        include_equip = false,
        pattern = ".|.|heart|hand",
        prompt = "#nos__enyuan-give:" .. player.id,
      })
      if #card > 0 then
        room:obtainCard(player, card, true, fk.ReasonGive, data.from, enyuan.name)
      else
        room:loseHp(data.from, 1, enyuan.name)
      end
    end
  end,
})

return enyuan