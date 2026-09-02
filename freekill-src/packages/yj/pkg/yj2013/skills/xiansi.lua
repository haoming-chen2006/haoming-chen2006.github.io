local xiansi = fk.CreateSkill {
  name = "xiansi",
  derived_piles = "liufeng_ni",
  attached_skill_name = "xiansi&",
}

Fk:loadTranslationTable{
  ["xiansi"] = "陷嗣",
  [":xiansi"] = "准备阶段，你可以将至多两名角色的各一张牌置于你的武将牌上，称为“逆”。当其他角色需要对你使用【杀】时，该角色可以弃置"..
  "你武将牌上的两张“逆”，视为对你使用一张【杀】。",

  ["xiansi&"] = "陷嗣",
  ["liufeng_ni"] = "逆",
  ["#xiansi-choose"] = "陷嗣：你可以将至多两名角色各一张牌置为“逆”",

  ["$xiansi1"] = "袭人于不意，溃敌于无形！",
  ["$xiansi2"] = "破敌军阵，父亲定会刮目相看！",
  ["$xiansi3"] = "此乃孟达之计，非我所愿！",
  ["$xiansi4"] = "我有何罪？！",
}

xiansi:addEffect(fk.EventPhaseStart, {
  anim_type = "control",
  audio_index = { 1, 2 },
  can_trigger = function(self, event, target, player, data)
    return target == player and player:hasSkill(xiansi.name) and player.phase == Player.Start and
      table.find(player.room.alive_players, function (p)
        return not p:isNude()
      end)
  end,
  on_cost = function(self, event, target, player, data)
    local room = player.room
    local targets = table.filter(room.alive_players, function (p)
      return not p:isNude()
    end)
    local tos = room:askToChoosePlayers(player, {
      skill_name = xiansi.name,
      min_num = 1,
      max_num = 2,
      targets = targets,
      prompt = "#xiansi-choose",
    })
    if #tos > 0 then
      room:sortByAction(tos)
      event:setCostData(self, {tos = tos})
      return true
    end
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    for _, p in ipairs(event:getCostData(self).tos) do
      if player.dead then return end
      if not p:isNude() and not p.dead then
        local id = room:askToChooseCard(player, {
          target = p,
          flag = "he",
          skill_name = xiansi.name,
        })
        player:addToPile("liufeng_ni", id, true, xiansi.name)
      end
    end
  end,
})

return xiansi
