local mouGuidao = fk.CreateSkill({
  name = "mou__guidao",
  dynamic_desc = function (self, player, lang)
    if Fk:currentRoom():isGameMode("role_mode") then
      return "mou__guidao_role"
    else
      return "mou__guidao_not_role"
    end
  end,
})

Fk:loadTranslationTable{
  ["mou__guidao"] = "鬼道",
  [":mou__guidao"] = "①游戏开始时，你获得2个“道兵”标记（你至多拥有8个“道兵”标记）；<br>"..
  "②当一名角色受到属性伤害后，你获得1个“道兵”标记（若不为身份模式改为2个）；<br>"..
  "③当你受到伤害时，你可以移去2个“道兵”标记，防止此伤害，若此时为你回合外，你不能以此法获得“道兵”标记直到你的下个回合开始。",

  [":mou__guidao_role"] = "①游戏开始时，你获得2个“道兵”标记（你至多拥有8个“道兵”标记）；<br>"..
  "②当一名角色受到属性伤害后，你获得1个“道兵”标记；<br>"..
  "③当你受到伤害时，你可以移去2个“道兵”标记，防止此伤害，若此时为你回合外，你不能以此法获得“道兵”标记直到你的下个回合开始。",
  [":mou__guidao_not_role"] = "①游戏开始时，你获得2个“道兵”标记（你至多拥有8个“道兵”标记）；<br>"..
  "②当一名角色受到属性伤害后，你获得2个“道兵”标记；<br>"..
  "③当你受到伤害时，你可以移去2个“道兵”标记，防止此伤害，若此时为你回合外，你不能以此法获得“道兵”标记直到你的下个回合开始。",

  ["#mou__guidao-invoke"] = "鬼道:你可以移去2个“道兵”标记，防止此次受到的伤害",
  ["#mou__guidao_invalidity-invoke"] = "鬼道:可移去2个“道兵”标记，防止此伤害，且〖鬼道〗②失效直到你下回合开始",

  ["$mou__guidao1"] = "世间万法，殊途同归！",
  ["$mou__guidao2"] = "从无邪恶之法，唯有作恶之人！",
}

mouGuidao:addEffect(fk.GameStart, {
  anim_type = "special",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mouGuidao.name) and player:getMark("@daobing") < 8
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    player.room:setPlayerMark(player, "@daobing", math.min(8, player:getMark("@daobing")+2))
  end,
})

mouGuidao:addEffect(fk.Damaged, {
  anim_type = "special",
  can_trigger = function(self, event, target, player, data)
    return
      player:hasSkill(mouGuidao.name) and
      data.damageType ~= fk.NormalDamage and
      player:getMark("@daobing") < 8 and
      player:getMark("mou__guidao_invalidity") == 0
  end,
  on_cost = Util.TrueFunc,
  on_use = function(self, event, target, player, data)
    local room = player.room
    local isRole = room:isGameMode("role_mode")
    room:setPlayerMark(player, "@daobing", math.min(8, player:getMark("@daobing") + (isRole and 1 or 2)))
  end,
})

mouGuidao:addEffect(fk.DetermineDamageInflicted, {
  anim_type = "defensive",
  can_trigger = function(self, event, target, player, data)
    return player:hasSkill(mouGuidao.name) and target == player and player:getMark("@daobing") >= 2
  end,
  on_cost = function (self, event, target, player, data)
    local prompt = player.phase == Player.NotActive and "#mou__guidao_invalidity-invoke" or "#mou__guidao-invoke"
    return player.room:askToSkillInvoke(player, { skill_name = mouGuidao.name, prompt = prompt })
  end,
  on_use = function(self, event, target, player, data)
    local room = player.room
    room:removePlayerMark(player, "@daobing", 2)
    data:preventDamage()
    if player.phase == Player.NotActive then room:addPlayerMark(player, "mou__guidao_invalidity") end
  end,
})

mouGuidao:addEffect(fk.TurnStart, {
  can_refresh = function (self, event, target, player, data)
    return target == player and player:getMark("mou__guidao_invalidity") > 0
  end,
  on_refresh = function (self, event, target, player, data)
    player.room:setPlayerMark(player, "mou__guidao_invalidity", 0)
  end,
})

return mouGuidao
