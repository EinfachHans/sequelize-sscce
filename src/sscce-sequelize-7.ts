import { CreationOptional, DataTypes, Model, NonAttribute } from '@sequelize/core';
import { createSequelize7Instance } from '../setup/create-sequelize-instance';
import { expect } from 'chai';
import sinon from 'sinon';
import { AfterDestroy, Attribute, HasMany, NotNull } from '@sequelize/core/decorators-legacy';

// if your issue is dialect specific, remove the dialects you don't need to test on.
export const testingOnDialects = new Set(['mssql', 'sqlite', 'mysql', 'mariadb', 'postgres', 'postgres-native']);

// You can delete this file if you don't want your SSCCE to be tested against Sequelize 7

// Your SSCCE goes inside this function.
export async function run() {
  // This function should be used instead of `new Sequelize()`.
  // It applies the config for your SSCCE to work on CI.
  const sequelize = createSequelize7Instance({
    logQueryParameters: true,
    benchmark: true,
    define: {
      // For less clutter in the SSCCE
      timestamps: false,
    },
  });

  const onDestroySpy = sinon.spy();

  class Child extends Model {
    declare id: CreationOptional<number>;

    @Attribute(DataTypes.INTEGER)
    @NotNull()
    declare parentId: number;

    @AfterDestroy()
    static async onAfterDestroy() {
      onDestroySpy();
    }

    declare parent?: NonAttribute<Parent>;
  }

  class Parent extends Model {
    declare id: CreationOptional<number>;

    @HasMany(() => Child, {
      foreignKey: 'parentId',
      inverse: 'parent',
      hooks: true
    })
    declare steps?: NonAttribute<Child[]>;
  }

  sequelize.addModels([Parent, Child])

  // You can use sinon and chai assertions directly in your SSCCE.
  const spy = sinon.spy();
  sequelize.afterBulkSync(() => spy());
  await sequelize.sync({ force: true });
  expect(spy).to.have.been.called;

  // Create parent
  const parent = await Parent.create({});

  // Create childs
  await Child.bulkCreate([{parentId: parent.id}, {parentId: parent.id}])

  // Destroy the parent
  await parent.destroy();

  // Childs should be destroyed - Works ✅
  expect(await Child.count()).to.equal(0)

  // On Destroy Spy should have been called twice (one per each child) - Does not work ❌
  expect(onDestroySpy).to.have.been.calledTwice;
}
