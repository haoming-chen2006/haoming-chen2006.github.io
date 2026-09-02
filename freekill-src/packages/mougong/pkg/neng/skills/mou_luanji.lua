local mouLuanji = fk.CreateSkill({
  name = "mou__luanji",
})

Fk:loadTranslationTable{
  ["mou__luanji"] = "乱击",
  [":mou__luanji"] = "出牌阶段限一次，你可以将两张手牌当【万箭齐发】使用；"..
  "当其他角色打出【闪】响应你使用的【万箭齐发】时，你摸一张牌（每回合你以此法至多获得三张牌）。",

  ["#mou__luanji-viewas"] = "发动乱击，选择两手牌当【万箭齐发】使用",
  ["#mou__luanji_trigger"] = "乱击",

  ["$mou__luanji1"] = "与我袁本初为敌，下场只有一个！",
  ["$mou__luanji2"] = "弓弩手，乱箭齐下，射杀此贼！",
}

mouLuanji:addEffect("viewas", {
  anim_type = "offensive",
  pattern = "archery_attack",
  prompt = "#mou__luanji-viewas",
  handly_pile = true,
  filter_pattern = {
    min_num = 2,
    max_num = 2,
    pattern = ".|.|.|^equip",
  },
  view_as = function(self, player, cards)
    if #cards == 2 then
      local archery_attack = Fk:cloneCard("archery_attack")
      archery_attack:addSubcards(cards)
      return archery_attack
    end
  end,
  enabled_at_play = function(self, player)
    return player:usedEffectTimes(self.name, Player.HistoryPhase) == 0
  end,
})

mouLuanji:addEffect(fk.CardResponding, {
  anim_type = "drawcard",
  can_trigger = function(self, event, target, player, data)
    if player:hasSkill(mouLuanji.name) and player:usedEffectTimes(self.name) < 3 and data.card.name == "jink" then
      return
        data.responseToEvent and
        data.responseToEvent.from == player and
        data.responseToEvent.card.name == "archery_attack"
    end
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player:broadcastSkillInvoke(mouLuanji.name)
    player:drawCards(1, self.name)
  end,
})

return mouLuanji
