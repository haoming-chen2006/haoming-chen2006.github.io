local zhengrong = fk.CreateSkill {
  name = "zhengrong",
  derived_piles = "$guanqiujian__glory",
}

Fk:loadTranslationTable{
  ["zhengrong"] = "征荣",
  [":zhengrong"] = "当你对其他角色造成伤害后，若其手牌数大于你，你可以将其一张牌置于你的武将牌上，称为“荣”。",

  ["$guanqiujian__glory"] = "荣",
  ["#zhengrong-invoke"] = "征荣：是否将 %dest 一张牌置为“荣”？",

  ["$zhengrong1"] = "东征高句丽，保辽东安稳。",
  ["$zhengrong2"] = "跨海东征，家国俱荣。",
}

zhengrong:addEffect(fk.Damage, {
  anim_type = "control",
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(zhengrong.name) and
      not data.to.dead and data.to:getHandcardNum() > player:getHandcardNum()
  end,
  on_cost = function(self, event, target, player, data)
    if player.room:askToSkillInvoke(player, {
      skill_name = zhengrong.name,
      prompt = "#zhengrong-invoke::"..data.to.id,
    }) then
      event:setCostData(self, {tos = {data.to}})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local card = room:askToChooseCard(player, {
      target = data.to,
      flag = "he",
      skill_name = zhengrong.name,
    })
    player:addToPile("$guanqiujian__glory", card, false, zhengrong.name)
  end,
})

return zhengrong
