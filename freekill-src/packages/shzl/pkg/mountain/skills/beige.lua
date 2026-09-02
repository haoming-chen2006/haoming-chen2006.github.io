local beige = fk.CreateSkill {
  name = "beige",
}

Fk:loadTranslationTable{
  ["beige"] = "悲歌",
  [":beige"] = "当一名角色受到【杀】造成的伤害后，你可以弃置一张牌，然后令其进行判定，若结果为：<font color='red'>♥</font>，其回复1点体力；"..
  "<font color='red'>♦</font>，其摸两张牌；♣，伤害来源弃置两张牌；♠，伤害来源翻面。",

  ["#beige-invoke"] = "悲歌：%dest 受到伤害，你可以弃置一张牌令其判定，根据花色执行效果",

  ["$beige1"] = "悲歌可以当泣，远望可以当归。",
  ["$beige2"] = "制兹八拍兮拟排忧，何知曲成兮心转愁。",
}

beige:addEffect(fk.Damaged, {
  anim_type = "masochism",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(beige.name) and data.card and data.card.trueName == "slash" and not data.to.dead and not player:isNude()
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToDiscard(player, {
      min_num = 1,
      max_num = 1,
      include_equip = true,
      skill_name = beige.name,
      cancelable = true,
      prompt = "#beige-invoke::"..target.id,
      skip = true,
    })
    if #card > 0 then
      event:setCostData(self, {tos = {target}, cards = card})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:throwCard(event:getCostData(self).cards, beige.name, player, player)
    if target.dead then return false end
    local judge = {
      who = target,
      reason = beige.name,
      pattern = {
        ["."] = "good",
        ["else"] = "bad"
      },
    }
    for _, suit in ipairs({ "heart", "diamond", "club", "spade" }) do
      judge.pattern[".|.|" .. suit] = suit
    end
    room:judge(judge)
    if not judge.results then return end
    if table.contains(judge.results, "heart") then
      if not target.dead and target:isWounded() then
        room:recover{
          who = target,
          num = 1,
          recoverBy = player,
          skillName = beige.name,
        }
      end
    elseif table.contains(judge.results, "diamond") then
      if not target.dead then
        target:drawCards(2, beige.name)
      end
    elseif table.contains(judge.results, "club") then
      if data.from and not data.from.dead then
        room:askToDiscard(data.from, {
          min_num = 2,
          max_num = 2,
          include_equip = true,
          skill_name = beige.name,
          cancelable = false,
        })
      end
    elseif table.contains(judge.results, "spade") then
      if data.from and not data.from.dead then
        data.from:turnOver()
      end
    end
  end,
})

return beige
