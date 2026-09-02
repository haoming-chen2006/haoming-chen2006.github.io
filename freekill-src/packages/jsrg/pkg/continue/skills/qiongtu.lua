local qiongtu = fk.CreateSkill {
  name = "qiongtu",
  tags = { Skill.AttachedKingdom },
  attached_kingdom = {"qun"},
}

Fk:loadTranslationTable{
  ["qiongtu"] = "穷途",
  [":qiongtu"] = "群势力技，每回合限一次，你可以将一张非基本牌置于武将牌上视为使用一张【无懈可击】，若该【无懈可击】生效，你摸一张牌，"..
  "否则你变更势力至魏并获得武将牌上的所有牌。",

  ["#qiongtu"] = "穷途：将一张非基本牌置于武将牌上，视为使用【无懈可击】",
}

qiongtu:addEffect("viewas", {
  anim_type = "control",
  pattern = "nullification",
  prompt = "#qiongtu",
  card_filter = function(self, player, to_select, selected)
    return #selected == 0 and Fk:getCardById(to_select).type ~= Card.TypeBasic
  end,
  view_as = function(self, player, cards)
    if #cards ~= 1 then return end
    local card = Fk:cloneCard("nullification")
    card.skillName = qiongtu.name
    card:addFakeSubcards(cards)
    return card
  end,
  before_use = function(self, player, use)
    player:addToPile(qiongtu.name, use.card.fake_subcards, true, qiongtu.name)
  end,
  after_use = function (self, player, use)
    if not player.dead then
      if use.extra_data and use.extra_data.qiongtu then
        local room = player.room
        room:changeKingdom(player, "wei", true)
        if #player:getPile(qiongtu.name) > 0 then
          room:obtainCard(player, player:getPile(qiongtu.name), true, fk.ReasonJustMove, player, qiongtu.name)
        end
      else
        player:drawCards(1, qiongtu.name)
      end
    end
  end,
  enabled_at_response = function(self, player, response)
    return not response and player:usedSkillTimes(qiongtu.name, Player.HistoryTurn) == 0 and not player:isNude()
  end,
})

qiongtu:addEffect(fk.CardEffectCancelledOut, {
  can_refresh = function(self, event, target, player, data)
    return target == player and table.contains(data.card.skillNames, qiongtu.name)
  end,
  on_refresh = function(self, event, target, player, data)
    local room = player.room
    local e = room.logic:getCurrentEvent():findParent(GameEvent.UseCard)
    if e then
      local use = e.data
      use.extra_data = use.extra_data or {}
      use.extra_data.qiongtu = true
    end
  end,
})

return qiongtu
